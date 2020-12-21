import Hapi from "@hapi/hapi";
import boom from "@hapi/boom";

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
