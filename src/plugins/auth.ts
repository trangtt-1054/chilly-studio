import Hapi from '@hapi/hapi';
import Joi from 'joi';
import Boom from '@hapi/boom';
import jwt from 'jsonwebtoken';
import { TokenType, UserRole } from '@prisma/client';
import { add, compareAsc } from 'date-fns';

const API_AUTH_STRATEGY = 'API'; //a constant to use as the name for authentication strategy

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_BY_TRANG';
const JWT_ALGORITHM = 'HS256';

declare module '@hapi/hapi' {
  interface AuthCredentials {
    userId: number;
    tokenId: number;
    isAdmin: boolean;
    // 👇 The courseIds that a user is a teacher of, thereby granting him permissions to change entitites
    teacherOf: number[];
  }
}

interface APITokenPayload {
  tokenId: number;
}

const apiTokenSchema = Joi.object({
  tokenId: Joi.number().integer().required(),
});

const validateAPIToken = async (
  decoded: APITokenPayload,
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) => {
  const { prisma } = request.server.app;
  const { tokenId } = decoded;
  const { error } = apiTokenSchema.validate(decoded); //run-time validator

  if (error) {
    request.log(['error', 'auth'], `API token error: ${error.message}`);
    return { isValid: false };
  }

  try {
    // Fetch the token from DB to verify it's valid
    const fetchedToken = await prisma.token.findUnique({
      where: {
        id: tokenId,
      },
      include: {
        user: true,
      },
    });

    // Check if token could be found in database and is valid
    if (!fetchedToken || !fetchedToken?.valid) {
      return { isValid: false, errorMessage: 'Invalid token' };
    }

    // Check token expiration
    if (fetchedToken.expiration < new Date()) {
      return { isValid: false, errorMessage: 'Token expired' };
    }

    const teacherOf = await prisma.collectionByUser.findMany({
      where: {
        userId: fetchedToken.userId,
        role: UserRole.ADMIN,
      },
      select: {
        collectionId: true,
      },
    });

    // The token is valid. Pass the token payload (in `decoded`), userId, and isAdmin to `credentials`
    // which is available in route handlers via request.auth.credentials
    return {
      isValid: true,
      credentials: {
        tokenId: decoded.tokenId,
        userId: fetchedToken.userId,
        isAdmin: fetchedToken.user.isAdmin,
        // convert teacherOf into an array of courseIds
        teacherOf: teacherOf.map(({ collectionId }) => collectionId),
      },
    };
  } catch (error) {
    request.log(['error', 'auth', 'db'], error);
    return { isValid: false, errorMessage: 'DB Error' };
  }
};

const authPlugin: Hapi.Plugin<null> = {
  name: 'app/auth',
  dependencies: ['prisma', 'hapi-auth-jwt2', 'app/email'],
  register: async function (server: Hapi.Server) {
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set!');
    }

    //declare what we call the authentication strategy
    server.auth.strategy(API_AUTH_STRATEGY, 'jwt', {
      key: JWT_SECRET,
      verifyOption: { algorithms: JWT_ALGORITHM },
      validate: () => {},
    });
    //the strategy here is an instance of the scheme, the scheme has already been defined by this hapi-auth-jwt. cái 'jwt' arg thứ 2 là cái default 'jwt' (see doc)
  },
};

export default authPlugin;
