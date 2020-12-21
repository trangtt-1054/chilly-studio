import Hapi from "@hapi/hapi";
import boom from "@hapi/boom";
import Joi from "@hapi/joi";

const userPlugin: Hapi.Plugin<undefined> = {
  name: "app/users",
  dependencies: ["prisma"], //load 'prisma' plugin before loading this plugin => to make sure that prisma instance is accessible inside handler
  register: async function (server: Hapi.Server) {
    //server.routes, we could start defining route and handlers
    server.route([
      {
        method: "POST",
        path: "/users",
        handler: createUserHandler,
        options: {
          validate: {
            payload: Joi.object({
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
            }) as any,
            failAction: (request, h, err) => {
              //err chính là cái validation error, error trả về sẽ cụ thể hơn
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
