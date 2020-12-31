import Hapi from "@hapi/hapi";
import boom from "@hapi/boom";
import Joi from "@hapi/joi";
import { API_AUTH_STRATEGY } from "./auth";
import Boom from "@hapi/boom";
import { isRequestedUserOrAdmin, isAdmin } from "../auth-helpers";

const userPlugin: Hapi.Plugin<undefined> = {
  name: "app/users",
  dependencies: ["prisma"], //load 'prisma' plugin before loading this plugin => to make sure that prisma instance is accessible inside handler
  register: async function (server: Hapi.Server) {
    //server.routes, we could start defining route and handlers
    server.route([
      {
        method: "GET",
        path: "/profile",
        handler: getAuthenticatedUser,
        options: {
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
        },
      },
      {
        method: "GET",
        path: "/users",
        handler: getAllUsersHandler,
        options: {
          pre: [isAdmin],
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            failAction: (request, h, err) => {
              // show validation errors to user https://github.com/hapijs/hapi/issues/3706
              throw err;
            },
          },
        },
      },
      {
        method: "POST",
        path: "/users",
        handler: createUserHandler,
        options: {
          pre: [isAdmin],
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            payload: UserInputValidator as any,
            failAction: (request, h, err) => {
              //err chính là cái validation error, error trả về sẽ cụ thể hơn
              throw err;
            },
          },
        },
      },
      {
        method: "GET",
        path: "/users/{userId}",
        handler: getUserHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.string().pattern(/^[0-9]+$/),
            }) as any,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "DELETE",
        path: "/users/{userId}",
        handler: deleteUserHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }) as any,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "PUT",
        path: "/users/{userId}",
        handler: updateUserHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: "required",
            strategy: API_AUTH_STRATEGY,
          },
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
    ]);
  },
};

export default userPlugin;

interface UserInput {
  email: string;
  firstName: string;
  lastName: string;
  social: {
    facebook?: string;
    twitter?: string;
    github?: string;
    website?: string;
    tiktok?: string;
  };
}

const UserInputValidator = Joi.object({
  //define expected structure, validate input cho mình, nếu input ko hợp lệ sẽ tự trả status code 400 invalid request payload input
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  social: Joi.object({
    facebook: Joi.string().optional(),
    twitter: Joi.string().optional(),
    github: Joi.string().optional(),
    website: Joi.string().uri().optional(),
    tiktok: Joi.string().optional(),
  }),
});

async function getAuthenticatedUser(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const { userId } = request.auth.credentials;

  try {
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        social: true,
      },
      where: {
        id: userId,
      },
    });
    return h.response(user || undefined).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation();
  }
}

async function getAllUsersHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        social: true,
      },
    });
    return h.response(users).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get users");
  }
}

async function createUserHandler(
  request: Hapi.Request,
  helper: Hapi.ResponseToolkit
) {
  //payload is the run-time object so we don't know the type of it => we have to use technique called Type Assertion to override inferred type
  const payload = request.payload as UserInput;
  //vì ở prisma đã declare module có prisma nên ở đây app có prisma
  const { prisma } = request.server.app;

  try {
    const newUser = await prisma.user.create({
      data: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        social: payload.social,
      },
    });
    return helper.response({ id: newUser.id }).code(201);
  } catch (error) {
    console.log(error);
    return boom.badImplementation("Failed to create new user");
  }
}

async function getUserHandler(
  request: Hapi.Request,
  helper: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = request.params.userId;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(userId, 10),
      },
    });

    if (!user) {
      return boom.notFound("User not found");
    }
    return helper.response(user).code(200);
  } catch (error) {
    console.log(error);
  }
}

async function updateUserHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);
  const payload = request.payload as Partial<UserInput>;

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: payload,
    });
    return h.response(updatedUser).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to update user");
  }
}

async function deleteUserHandler(
  request: Hapi.Request,
  helper: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = request.params.userId;
  try {
    const user = await prisma.user.delete({
      where: {
        id: parseInt(userId, 10),
      },
    });
    return helper.response().code(204);
  } catch (error) {
    console.log(error);
    return boom.badImplementation("failed to delete user");
  }
}
