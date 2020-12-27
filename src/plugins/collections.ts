import Hapi from '@hapi/hapi';
import Joi, { required } from 'joi';
import Boom, { boomify } from '@hapi/boom';
import { API_AUTH_STRATEGY } from './auth';
import { UserRole } from '@prisma/client';
import { isOwnerOfCollectionOrAdmin } from '../auth-helpers';

const collectionsPlugin = {
  name: 'app/collection',
  dependencies: ['prisma'],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: 'GET',
        path: '/collections/{collectionId}',
        handler: getCollectionById,
        options: {
          //dù có default strategy rồi nhưng explicit auth như này thì tốt hơn
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              collectionId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'GET',
        path: '/collections',
        handler: getCollectionsHandler,
        options: {
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
        },
      },
      {
        method: 'POST',
        path: '/collections',
        handler: createCollectionHandler,
        options: {
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            payload: createCollectionValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'PUT',
        path: '/collections/{collectionId}',
        handler: updateCollectionHandler,
        options: {
          //pre functions get called before handler, tách riêng thành pre function chứ ko cho vào handler để sau này còn reuse đc
          pre: [isOwnerOfCollectionOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              collectionId: Joi.number().integer(),
            }),
            payload: updateCollectionValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'DELETE',
        path: '/collections/{collectionId}',
        handler: deleteCollectionHandler,
        options: {
          pre: [isOwnerOfCollectionOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              collectionId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
    ]);
  },
};

export default collectionsPlugin;

const collectionInputValidator = Joi.object({
  name: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
  details: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
});

const createCollectionValidator = collectionInputValidator.tailor('create');
const updateCollectionValidator = collectionInputValidator.tailor('update');

interface CollectionInput {
  name: string;
  details: string;
}

async function getCollectionById(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const collectionId = parseInt(request.params.collectionId, 10);

  try {
    const collection = await prisma.collection.findUnique({
      where: {
        id: collectionId,
      },
      include: {
        records: true,
      },
    });
    if (!collection) {
      return h.response().code(404);
    } else {
      return h.response(collection).code(200);
    }
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to get collection');
  }
}

async function getCollectionsHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  console.log(request.auth.credentials);
  try {
    const collections = await prisma.collection.findMany({
      include: {
        records: true,
      },
    });
    return h.response(collections).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to get collection');
  }
}

async function createCollectionHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as CollectionInput;
  const { userId } = request.auth.credentials;

  try {
    // when creating a collection make the authenticated user a teacher of the collection
    const createdCollection = await prisma.collection.create({
      data: {
        name: payload.name,
        details: payload.details,
        members: {
          create: {
            role: UserRole.OWNER, //khi create collection thì đc tự động assigned thành OWNER của collection đó
            user: {
              connect: {
                id: userId,
              },
            },
          },
        },
      },
    });
    return h.response(createdCollection).code(201);
  } catch (err) {
    request.log('error', err);

    return Boom.badImplementation('failed to create collection');
  }
}

async function updateCollectionHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const collectionId = parseInt(request.params.collectionId, 10);
  const payload = request.payload as Partial<CollectionInput>;

  try {
    const updatedCollection = await prisma.collection.update({
      where: {
        id: collectionId,
      },
      data: payload,
    });
    return h.response(updatedCollection).code(200);
  } catch (err) {
    request.log('error', err);
    console.log(err);
    return Boom.badImplementation('failed to update collection');
  }
}

async function deleteCollectionHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const collectionId = parseInt(request.params.collectionId, 10);

  try {
    // Delete all enrollments
    await prisma.$transaction([
      prisma.collectionByUser.deleteMany({
        where: {
          collectionId: collectionId,
        },
      }),
      prisma.collection.delete({
        where: {
          id: collectionId,
        },
      }),
    ]);
    return h.response().code(204);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to delete collection');
  }
}
