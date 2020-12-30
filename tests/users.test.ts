import Hapi, { AuthCredentials } from '@hapi/hapi';
import { createServer } from '../src/server';
import { createUserCredentials } from './test-helpers';
import { API_AUTH_STRATEGY } from '../src/plugins/auth';

describe('POST /users - create user', () => {
  let server: Hapi.Server;
  let testUserCredentials: AuthCredentials;
  let testAdminCredentials: AuthCredentials;

  beforeAll(async () => {
    server = await createServer();
    testUserCredentials = await createUserCredentials(server.app.prisma, false);
    testAdminCredentials = await createUserCredentials(server.app.prisma, true);
  });

  afterAll(async () => {
    await server.stop();
  });

  let userId: number;

  test('profile', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/profile',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });

    expect(response.statusCode).toEqual(200);

    let fetchedUserId = JSON.parse(response.payload)?.id as number;
    expect(fetchedUserId).toEqual(testUserCredentials.userId);
  });

  test('create user', async () => {
    //inject a synthetic request without having to run HTTP server
    const response = await server.inject({
      method: 'POST',
      url: '/users',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testAdminCredentials,
      },
      payload: {
        firstName: 'test',
        lastName: 'test',
        email: `test-${Date.now()}@prisma.io`,
        social: {
          twitter: 'twitter',
          website: 'https://www.thisisalice.com', //website phải đúng format của url ko thì lỗi 400
        },
      },
    });
    expect(response.statusCode).toEqual(201);
    userId = JSON.parse(response.payload)?.id;
    expect(userId).toBeTruthy();
  });

  test('create user fails with invalid input', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/users',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testAdminCredentials,
      },
      payload: {
        email: `test-${Date.now()}@prisma.io`,
        social: {
          twitter: 'twitter',
          website: 'website.com',
        },
      },
    });
    expect(response.statusCode).toEqual(400);
  });

  test('delete user', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: `/users/${userId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testAdminCredentials,
      },
    });
    expect(response.statusCode).toEqual(204);
  });
});
