import Hapi from '@hapi/hapi';
import StatusPlugin from './plugins/status';
import prismaPlugin from './plugins/prisma';
import userPlugin from './plugins/user';
import authPlugin from './plugins/auth';
import hapiAuthJWT from 'hapi-auth-jwt2';
import emailPlugin from './plugins/email';

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
});

export async function createServer(): Promise<Hapi.Server> {
  await server.register([
    StatusPlugin,
    prismaPlugin,
    userPlugin,
    hapiAuthJWT,
    emailPlugin,
    authPlugin,
  ]);
  await server.initialize();

  return server;
}

export async function startServer(server: Hapi.Server): Promise<Hapi.Server> {
  await server.start();
  console.log(`Server running on ${server.info.uri}`);
  return server;
}

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

// start().catch((err) => {
//   console.log(err);
// });
