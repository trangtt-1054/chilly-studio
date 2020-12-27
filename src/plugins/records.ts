import Hapi from '@hapi/hapi';
import Joi from 'joi';
import Boom from '@hapi/boom';
import { API_AUTH_STRATEGY } from './auth';
import {
  isOwnerOfCollectionOrAdmin,
  isOwnerOfRecordOrAdmin,
} from '../auth-helpers';

const recordsPlugin = {
  name: 'app/records',
  dependencies: ['prisma'],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: 'GET',
        path: '/collections/records/{recordId}',
        handler: getRecordHandler,
        options: {
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'POST',
        path: '/collections/{collectionId}/records',
        handler: createRecordHandler,
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
            payload: createrecordValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'PUT',
        path: '/collections/records/{recordId}',
        handler: updateRecordHandler,
        options: {
          pre: [isOwnerOfRecordOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordId: Joi.number().integer(),
            }),
            payload: updaterecordValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'DELETE',
        path: '/collections/records/{recordId}',
        handler: deleterecordHandler,
        options: {
          pre: [isOwnerOfRecordOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordId: Joi.number().integer(),
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

export default recordsPlugin;

const recordInputValidator = Joi.object({
  name: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
  date: Joi.date().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
});

const createrecordValidator = recordInputValidator.tailor('create');
const updaterecordValidator = recordInputValidator.tailor('update');

interface recordInput {
  name: string;
  date: Date;
}

async function getRecordHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordId = parseInt(request.params.recordId, 10);

  try {
    const record = await prisma.record.findUnique({
      where: {
        id: recordId,
      },
    });
    if (!record) {
      return h.response().code(404);
    } else {
      return h.response(record).code(200);
    }
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to get record');
  }
}

async function createRecordHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as recordInput;
  const collectionId = parseInt(request.params.collectionId, 10);

  try {
    const createdrecord = await prisma.record.create({
      data: {
        name: payload.name,
        date: payload.date,
        collection: {
          connect: {
            id: collectionId,
          },
        },
      },
    });
    return h.response(createdrecord).code(201);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to create record');
  }
}

async function deleterecordHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordId = parseInt(request.params.recordId, 10);

  try {
    await prisma.record.delete({
      where: {
        id: recordId,
      },
    });
    return h.response().code(204);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to delete record');
  }
}

async function updateRecordHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordId = parseInt(request.params.recordId, 10);
  const payload = request.payload as Partial<recordInput>;

  try {
    const updatedrecord = await prisma.record.update({
      where: {
        id: recordId,
      },
      data: payload,
    });
    return h.response(updatedrecord).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to update record');
  }
}
