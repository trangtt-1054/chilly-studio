import Hapi from '@hapi/hapi';
import Joi, { object } from 'joi';
import Boom from '@hapi/boom';
import { UserRole } from '@prisma/client';
import { API_AUTH_STRATEGY } from './auth';
import { isRequestedUserOrAdmin } from '../auth-helpers';

const userCollectionPlugin = {
  name: 'app/userCollection',
  dependencies: ['prisma'],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: 'GET',
        path: '/users/{userId}/collections',
        handler: getUserCollectionsHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
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
        path: '/users/{userId}/collections',
        handler: createUserCollectionHandler,
        options: {
          // TODO: ensure that only a owner of a collection can enroll other users as owners
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
            payload: Joi.object({
              collectionId: Joi.number().integer(),
              // 👇 Allow roles derived from the generated Prisma types
              role: Joi.string().valid(...Object.values(UserRole)),
            }),
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'DELETE',
        path: '/users/{userId}/collections/{collectionId}',
        handler: deleteUserCollectionHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
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

export default userCollectionPlugin;

interface UserCollectionInput {
  collectionId: number;
  role: UserRole;
}

async function getUserCollectionsHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);

  try {
    const usercollections = await prisma.collection.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });
    return h.response(usercollections).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to get user');
  }
}

async function createUserCollectionHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);
  const payload = request.payload as UserCollectionInput;

  try {
    const usercollections = await prisma.collectionByUser.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        collection: {
          connect: {
            id: payload.collectionId,
          },
        },
        role: payload.role,
      },
    });
    return h.response(usercollections).code(201);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to update the user collections');
  }
}

async function deleteUserCollectionHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);
  const collectionId = parseInt(request.params.collectionId, 10);

  try {
    await prisma.collectionByUser.delete({
      where: {
        userId_collectionId: {
          userId,
          collectionId,
        },
      },
    });
    return h.response().code(204);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation(
      `failed to delete the user: ${userId} in collection: ${collectionId} `
    );
  }
}
