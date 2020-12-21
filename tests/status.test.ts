import Hapi from '@hapi/hapi';
import { createServer } from '../src/server';

describe('Status plugin', () => {
  let server: Hapi.Server;
  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.stop(); //disconnect prisma
  });

  test(`POST / doesn't exist`, async () => {
    //allow us to inject request into created server although it's not actually listening to any ports, like integration testing
    const response = await server.inject({
      url: '/',
      method: 'POST',
    });

    expect(response.statusCode).toEqual(404);
  });

  test('status endpoint works', async () => {
    const response = await server.inject({
      url: '/',
      method: 'GET',
    });

    expect(response.statusCode).toEqual(200);
    const payload = JSON.parse(response.payload);
    expect(payload.up).toEqual(true);
  });
});
