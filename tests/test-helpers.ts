import { PrismaClient } from '@prisma/client';
import { TokenType, UserRole } from '@prisma/client';
import { add } from 'date-fns';
import { AuthCredentials } from '@hapi/hapi';

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
export const createCourseTestStudentTeacher = async (
  prisma: PrismaClient
): Promise<{
  courseId: number;
  testId: number;
  studentId: number;
  teacherId: number;
  studentCredentials: AuthCredentials;
  teacherCredentials: AuthCredentials;
}> => {
  const teacherCredentials = await createUserCredentials(prisma, false);
  const studentCredentials = await createUserCredentials(prisma, false);

  const now = Date.now().toString();
  const course = await prisma.collection.create({
    data: {
      name: `test-course-${now}`,
      details: `test-course-${now}-details`,
      members: {
        create: [
          {
            role: UserRole.OWNER,
            user: {
              connect: {
                id: teacherCredentials.userId,
              },
            },
          },
          {
            role: UserRole.VIEWER,
            user: {
              connect: {
                id: studentCredentials.userId,
              },
            },
          },
        ],
      },
      records: {
        create: [
          {
            date: add(new Date(), { days: 7 }),
            name: 'First test',
          },
        ],
      },
    },
    include: {
      records: true,
    },
  });

  // 👇Update the credentials as they're static in tests (not fetched automatically on request by the auth plugin)
  teacherCredentials.ownerOf.push(course.id);

  return {
    courseId: course.id,
    testId: course.records[0].id,
    teacherId: teacherCredentials.userId,
    teacherCredentials,
    studentId: studentCredentials.userId,
    studentCredentials,
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
