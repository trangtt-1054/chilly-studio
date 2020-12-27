import Boom from '@hapi/boom';
import Hapi from '@hapi/hapi';

// Pre function to check if user is the teacher of a course and can modify it
export async function isOwnerOfCollectionOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { isAdmin, ownerOf } = request.auth.credentials;

  if (isAdmin) {
    // If the user is an admin allow
    return h.continue;
  }

  const collectionId = parseInt(request.params.courseId, 10);

  if (ownerOf?.includes(collectionId)) {
    return h.continue;
  }
  // If the user is not a teacher of the course, deny access
  throw Boom.forbidden();
}

// Pre function to check if authenticated user is the grader of a testResult
export async function isGraderOfRecordRateOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { userId, isAdmin, teacherOf } = request.auth.credentials;

  if (isAdmin) {
    // If the user is an admin allow
    return h.continue;
  }

  const recordRateId = parseInt(request.params.testResultId, 10);
  const { prisma } = request.server.app;

  const recordRate = await prisma.recordRate.findUnique({
    where: {
      id: recordRateId,
    },
  });

  if (recordRate?.graderId === userId) {
    return h.continue;
  }
  // The authenticated user is not a teacher
  throw Boom.forbidden();
}

// Pre function to check if the authenticated user matches the requested user
export async function isRequestedUserOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { userId, isAdmin } = request.auth.credentials;

  if (isAdmin) {
    // If the user is an admin allow
    return h.continue;
  }

  const requestedUserId = parseInt(request.params.userId, 10);

  if (requestedUserId === userId) {
    return h.continue;
  }

  // The authenticated user is not authorized
  throw Boom.forbidden();
}

// Pre function to check if the authenticated user matches the requested user
export async function isAdmin(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  if (request.auth.credentials.isAdmin) {
    // If the user is an admin allow
    return h.continue;
  }

  // The authenticated user is not a teacher
  throw Boom.forbidden();
}

// Pre function to check if user is the teacher of a test's course
export async function isOwnerOfRecordOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { isAdmin, ownerOf } = request.auth.credentials;

  if (isAdmin) {
    // If the user is an admin allow
    return h.continue;
  }

  const recordId = parseInt(request.params.recordId, 10);
  const { prisma } = request.server.app;

  const record = await prisma.record.findUnique({
    where: {
      id: recordId,
    },
    select: {
      collection: {
        select: {
          id: true,
        },
      },
    },
  });

  if (record?.collection.id && ownerOf.includes(record?.collection.id)) {
    return h.continue;
  }
  // The authenticated user is not a teacher
  throw Boom.forbidden();
}
