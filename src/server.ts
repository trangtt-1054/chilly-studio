import Hapi from "@hapi/hapi";

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "localhost",
});

export async function start(): Promise<Hapi.Server> {
  //status endpoint
  server.route({
    method: "GET",
    path: "/",
    //handler: function gets called every time a request comes in, ResponseToolKit is a package of utilities, allow us to send response to user
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
      return h.response({ up: true }).code(200);
    },
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
  return server;
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

start().catch((err) => {
  console.log(err);
});
