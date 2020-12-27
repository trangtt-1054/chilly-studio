import { createServer } from '../src/server';
import Hapi, { AuthCredentials } from '@hapi/hapi';
import { createUserCredentials } from './test-helpers';
import { API_AUTH_STRATEGY } from '../src/plugins/auth';

//These tests run against real database => integration tests

describe('collections endpoints', () => {
  let server: Hapi.Server;
  let testUserCredentials: AuthCredentials;
  let testAdminCredentials: AuthCredentials;

  beforeAll(async () => {
    server = await createServer();

    // Create a test user and admin and get the credentials object for them, nếu ko mock credential này thì tất cả test sẽ fail
    testUserCredentials = await createUserCredentials(server.app.prisma, false);
    testAdminCredentials = await createUserCredentials(server.app.prisma, true);
  });

  afterAll(async () => {
    await server.stop();
  });

  let collectionId: number;

  test('create collection', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/collections',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
      payload: {
        name: 'Modern Backend with TypeScript, PostgreSQL, and Prisma',
        details:
          'Explore and demonstrate different patterns, problems, and architectures for a modern backend by solving a concrete problem: **a grading system for online collections.**',
      },
    });

    expect(response.statusCode).toEqual(201);

    collectionId = JSON.parse(response.payload)?.id;
    // 👇Update the credentials as they're static in tests (not fetched automatically on request by the auth plugin). when we create collection, testUserCredentials isn't updated (cụ thể là cái ownerOf ko đc update nên bên dưới update collection sẽ fail).
    testUserCredentials.ownerOf.push(collectionId);
    expect(typeof collectionId === 'number').toBeTruthy();
  });

  test('create collection auth', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/collections',
      payload: {
        name: 'Modern Backend with TypeScript, PostgreSQL, and Prisma',
        collectionDetails:
          'Explore and demonstrate different patterns, problems, and architectures for a modern backend by solving a concrete problem: **a grading system for online collections.**',
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  test('create collection validation', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/collections',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
      payload: {
        name: 'name',
      },
    });

    expect(response.statusCode).toEqual(400);
  });

  test('get collection returns 404 for non existant collection', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/collections/9999',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });

    expect(response.statusCode).toEqual(404);
  });

  test('get collection returns collection', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/collections/${collectionId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(200);
    const collection = JSON.parse(response.payload);

    expect(collection.id).toBe(collectionId);
  });

  test('get collections returns collections with their tests', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/collections`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(200);
    const collection = JSON.parse(response.payload);

    expect(Array.isArray(collection)).toBeTruthy();
    expect(collection[0]?.id).toBeTruthy();
    expect(collection[0]?.records).toBeTruthy();
  });

  test('get collection fails with invalid id', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/collections/a123',
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(400);
  });

  test('update collection fails with invalid collectionId parameter', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: `/collections/aa22`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(400);
  });

  test('update collection', async () => {
    const updatedName = 'test-UPDATED';

    const response = await server.inject({
      method: 'PUT',
      url: `/collections/${collectionId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
      payload: {
        name: updatedName,
      },
    });
    expect(response.statusCode).toEqual(200);
    const collection = JSON.parse(response.payload);
    expect(collection.name).toEqual(updatedName);
  });

  test('update collection as an admin', async () => {
    const updatedName = 'test-UPDATED-BY-ADMIN';

    const response = await server.inject({
      method: 'PUT',
      url: `/collections/${collectionId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testAdminCredentials,
      },
      payload: {
        name: updatedName,
      },
    });
    expect(response.statusCode).toEqual(200);
    const collection = JSON.parse(response.payload);
    expect(collection.name).toEqual(updatedName);
  });

  test('delete collection fails with invalid collectionId parameter', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: `/collections/aa22`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(400);
  });

  test('delete collection', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: `/collections/${collectionId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCredentials,
      },
    });
    expect(response.statusCode).toEqual(204);
  });
});
