import Hapi from '@hapi/hapi';
import boom from '@hapi/boom';

//don't need generics => pass in `undefined`
const plugin: Hapi.Plugin<undefined> = {
  name: 'app/status', //optional but useful to have
  //register: a function automatically called by Hapi when register a plugin
  register: async function (server: Hapi.Server) {
    server.route({
      method: 'GET',
      path: '/',
      //handler: function gets called every time a request comes in, ResponseToolKit is a package of utilities, allow us to send response to user
      handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
        //return boom.badImplementation("Internal Server Error");
        return h.response({ up: true }).code(200);
      },
    });
  },
};

export default plugin;
