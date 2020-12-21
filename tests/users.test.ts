import Hapi from '@hapi/hapi';
import { createServer } from '../src/server';

describe('POST /users - create user', () => {
  let server: Hapi.Server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  let userId: number;

  test('create user', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/users',
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
    });
    expect(response.statusCode).toEqual(204);
  });
});
