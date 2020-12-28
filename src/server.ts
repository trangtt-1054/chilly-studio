import Hapi from '@hapi/hapi';
import StatusPlugin from './plugins/status';
import prismaPlugin from './plugins/prisma';
import userPlugin from './plugins/user';
import authPlugin from './plugins/auth';
import hapiAuthJWT from 'hapi-auth-jwt2';
import emailPlugin from './plugins/email';
import collectionsPlugin from './plugins/collections';
import recordsPlugin from './plugins/records';
import recordRatesPlugin from './plugins/record-rates';
import userCollectionPlugin from './plugins/user-collections';
import dotenv from 'dotenv';
import hapiPino from 'hapi-pino';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
});

export async function createServer(): Promise<Hapi.Server> {
  await server.register({
    plugin: hapiPino,
    options: {
      logEvents:
        process.env.CI === 'true' || process.env.TEST === 'true'
          ? false
          : undefined,
      prettyPrint: process.env.NODE_ENV !== 'production',
      // Redact Authorization headers, see https://getpino.io/#/docs/redaction
      redact: ['req.headers.authorization'],
    },
  });

  await server.register([
    StatusPlugin,
    prismaPlugin,
    userPlugin,
    hapiAuthJWT,
    emailPlugin,
    authPlugin,
    collectionsPlugin,
    recordsPlugin,
    recordRatesPlugin,
    userCollectionPlugin,
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
