import { PrismaClient } from "@prisma/client";
import { TokenType, UserRole } from "@prisma/client";
import { add } from "date-fns";
import { AuthCredentials } from "@hapi/hapi";

// Helper function to create a test user and return the credentials object the same way that the auth plugin does
export const createUserCredentials = async (
  prisma: PrismaClient,
  isAdmin: boolean
): Promise<AuthCredentials> => {
  const testUser = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@test.com`,
      isAdmin,
      Token: {
        create: {
          expiration: add(new Date(), { days: 7 }),
          type: TokenType.API,
        },
      },
    },
    include: {
      Token: true,
      collections: {
        where: {
          role: UserRole.OWNER,
        },
        select: {
          collectionId: true,
        },
      },
    },
  });

  return {
    userId: testUser.id,
    tokenId: testUser.Token[0].id,
    isAdmin: testUser.isAdmin,
    ownerOf: testUser.collections?.map(({ collectionId }) => collectionId),
  };
};

// Helper function to create a course, test, student, and a teacher
export const createCollectionRecordViewerOwner = async (
  prisma: PrismaClient
): Promise<{
  collectionId: number;
  recordId: number;
  viewerId: number;
  ownerId: number;
  viewerCredentials: AuthCredentials;
  ownerCredentials: AuthCredentials;
}> => {
  const ownerCredentials = await createUserCredentials(prisma, false);
  const viewerCredentials = await createUserCredentials(prisma, false);

  const now = Date.now().toString();
  const collection = await prisma.collection.create({
    data: {
      name: `test-course-${now}`,
      details: `test-course-${now}-details`,
      members: {
        create: [
          {
            role: UserRole.OWNER,
            user: {
              connect: {
                id: ownerCredentials.userId as number,
              },
            },
          },
          {
            role: UserRole.VIEWER,
            user: {
              connect: {
                id: viewerCredentials.userId as number,
              },
            },
          },
        ],
      },
      records: {
        create: [
          {
            date: add(new Date(), { days: 7 }),
            name: "First test",
          },
        ],
      },
    },
    include: {
      records: true,
    },
  });

  // 👇Update the credentials as they're static in tests (not fetched automatically on request by the auth plugin)
  const ownerOf = ownerCredentials.ownerOf as number[];
  ownerOf.push(collection.id);

  return {
    collectionId: collection.id,
    recordId: collection.records[0].id,
    ownerId: ownerCredentials.userId as number,
    ownerCredentials: ownerCredentials,
    viewerId: viewerCredentials.userId as number,
    viewerCredentials: viewerCredentials,
  };
};

// Helper function to create a course
export const createCourse = async (prisma: PrismaClient): Promise<number> => {
  const course = await prisma.collection.create({
    data: {
      name: `test-course-${Date.now().toString()}`,
      details: `test-course-${Date.now().toString()}-details`,
    },
  });
  return course.id;
};
