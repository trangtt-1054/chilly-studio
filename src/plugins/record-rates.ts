import Hapi from '@hapi/hapi';
import Joi from 'joi';
import Boom from '@hapi/boom';
import { API_AUTH_STRATEGY } from './auth';
import {
  isRequestedUserOrAdmin,
  isOwnerOfRecordOrAdmin,
  isGraderOfRecordRateOrAdmin,
} from '../auth-helpers';

const recordRatesPlugin = {
  name: 'app/recordRates',
  dependencies: ['prisma'],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: 'GET',
        path: '/users/{userId}/record-rates',
        handler: getUseRecordRatesHandler,
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
        method: 'GET',
        path: '/collections/records/{recordId}/record-rates',
        handler: getRecordRatesHandler,
        options: {
          pre: [isOwnerOfRecordOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordId: Joi.number().integer().integer(),
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
        path: '/collections/records/{recordId}/record-rates',
        handler: createRecordRatesHandler,
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
            payload: createrecordRateValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'PUT',
        path: '/collections/records/record-rates/{recordRateId}',
        handler: updateRecordRateHandler,
        options: {
          pre: [isGraderOfRecordRateOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordRateId: Joi.number().integer(),
            }),
            payload: updaterecordRateValidator,
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: 'DELETE',
        path: '/collections/records/record-rates/{recordRateId}',
        handler: deleteRecordRateHandler,
        options: {
          pre: [isGraderOfRecordRateOrAdmin],
          auth: {
            mode: 'required',
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              recordRateId: Joi.number().integer(),
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

export default recordRatesPlugin;

// Once a record result is created, only the result can be updated.
const recordRateInputValidator = Joi.object({
  point: Joi.number().integer().sign('positive').max(1000).required(),
  memberId: Joi.number()
    .integer()
    .alter({
      create: (schema) => schema.required(),
      update: (schema) => schema.forbidden(),
    }),
  graderId: Joi.number()
    .integer()
    .alter({
      create: (schema) => schema.required(),
      update: (schema) => schema.forbidden(),
    }),
});

const createrecordRateValidator = recordRateInputValidator.tailor('create');
const updaterecordRateValidator = recordRateInputValidator.tailor('update');

interface recordRateInput {
  point: number;
  memberId: number;
  graderId: number;
}

async function getRecordRatesHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordId = parseInt(request.params.recordId, 10);

  try {
    const recordRates = await prisma.recordRate.findMany({
      where: {
        recordId: recordId,
      },
    });

    return h.response(recordRates).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation(
      `failed to get record results for record ${recordId}`
    );
  }
}

async function getUseRecordRatesHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);

  try {
    const userRecordRates = await prisma.recordRate.findMany({
      where: {
        memberId: userId,
      },
    });
    return h.response(userRecordRates).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to get user record results');
  }
}

async function createRecordRatesHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as recordRateInput;
  const recordId = parseInt(request.params.recordId, 10);

  try {
    const createdRecordRate = await prisma.recordRate.create({
      data: {
        point: payload.point,
        member: {
          connect: { id: payload.memberId },
        },
        gradedBy: {
          connect: { id: payload.graderId },
        },
        record: {
          connect: {
            id: recordId,
          },
        },
      },
    });
    return h.response(createdRecordRate).code(201);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation(
      `failed to create record result for recordId: ${recordId}`
    );
  }
}

async function updateRecordRateHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordRateId = parseInt(request.params.recordRateId, 10);
  const payload = request.payload as Pick<recordRateInput, 'point'>;

  try {
    // Only allow updating the result
    const updatedRecordRate = await prisma.recordRate.update({
      where: {
        id: recordRateId,
      },
      data: {
        point: payload.point,
      },
    });
    return h.response(updatedRecordRate).code(200);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to update record result');
  }
}

async function deleteRecordRateHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const recordRateId = parseInt(request.params.recordRateId, 10);

  try {
    await prisma.recordRate.delete({
      where: {
        id: recordRateId,
      },
    });
    return h.response().code(204);
  } catch (err) {
    request.log('error', err);
    return Boom.badImplementation('failed to delete record result');
  }
}
