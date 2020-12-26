import Hapi from '@hapi/hapi';
import Joi from 'joi';
import Boom from '@hapi/boom';
import jwt from 'jsonwebtoken';
import { TokenType, UserRole } from '@prisma/client';
import { add, compareAsc } from 'date-fns';

interface APITokenPayload {
  tokenId: number;
}

interface LoginInput {
  email: string;
}

interface AuthenticateInput {
  email: string;
  emailToken: string;
}

export const API_AUTH_STRATEGY = 'API'; //a constant to use as the name for authentication strategy

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_BY_TRANG';
const JWT_ALGORITHM = 'HS256';
const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;
const AUTHENTICATION_TOKEN_EXPIRATION_HOURS = 12;

declare module '@hapi/hapi' {
  interface AuthCredentials {
    userId: number;
    tokenId: number;
    isAdmin: boolean;
    // 👇 The courseIds that a user is a teacher of, thereby granting him permissions to change entitites
    teacherOf: number[];
  }
}

//runtime validation
const apiTokenSchema = Joi.object({
  tokenId: Joi.number().integer().required(),
  iat: Joi.any(),
  exp: Joi.any(),
});

const validateAPIToken = async (
  decoded: APITokenPayload,
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) => {
  //có đc type PrismaClient ở đây là nhờ declare module ở bên prisma.ts
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

const loginHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
  const { prisma, sendEmailToken } = request.server.app;
  const { email } = request.payload as LoginInput;
  const emailToken = generateEmailToken();

  const tokenExpiration = add(new Date(), {
    minutes: EMAIL_TOKEN_EXPIRATION_MINUTES,
  });

  try {
    //create a user if it doesn't exist and a short-lived token
    const createdToken = await prisma.token.create({
      data: {
        emailToken,
        expiration: tokenExpiration,
        type: TokenType.EMAIL,
        user: {
          //vì endpoint này vừa connect vừa create đc nên dùng connectOrCreate
          connectOrCreate: {
            create: {
              email,
            },
            //trong trường hợp connecting thì dùng where, chưa có thì sẽ dùng cái create ở trên
            where: {
              email,
            },
          },
        },
      },
    });
    await sendEmailToken(email, emailToken);
    return h.response().code(200);
  } catch (error) {
    console.log(error);
    return Boom.badImplementation(error.message);
  }
};

const authenticateHandler = async (
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) => {
  const { prisma } = request.server.app;
  const { email, emailToken } = request.payload as AuthenticateInput;

  //verify that this emailToken matches the user
  try {
    const fetchedEmailToken = await prisma.token.findUnique({
      where: { emailToken },
      include: {
        user: true, //explicitly tell prisma to return user because by defaut Prisma only returns scalar field
      },
    });

    if (fetchedEmailToken?.expiration! < new Date()) {
      return Boom.unauthorized('Token expired!');
    }

    if (!fetchedEmailToken?.valid) {
      return Boom.unauthorized('Invalid Token!!!');
    }

    if (fetchedEmailToken && fetchedEmailToken.user.email === email) {
      ``; //check if email passed in matches the one found in token
      const tokenExpiration = add(new Date(), {
        hours: AUTHENTICATION_TOKEN_EXPIRATION_HOURS,
      });

      //create a long lived token to be referenced in the JWT payload
      const createdToken = await prisma.token.create({
        data: {
          type: TokenType.API,
          expiration: tokenExpiration,
          user: {
            connect: {
              email,
            },
          },
        },
      });

      //invalidate emailToken (we can only use emailToken once)
      await prisma.token.update({
        where: {
          id: fetchedEmailToken.id,
        },
        data: {
          valid: false,
        },
      });

      //add the token ID of createdToken above to the JWT payload
      const authToken = generateApiToken(createdToken.id);
      return h.response().code(200).header('Authorization', authToken);
    }
  } catch (error) {
    console.log(error);
    return Boom.badImplementation(error.message);
  }
};

const generateApiToken = (tokenId: number) => {
  const jwtPayload = { tokenId };
  return jwt.sign(jwtPayload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
  });
};

//generate an 8-digit number
const generateEmailToken = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
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
      validate: validateAPIToken,
    });
    //the strategy here is an instance of the scheme, the scheme has already been defined by this hapi-auth-jwt. cái 'jwt' arg thứ 2 là cái default 'jwt' (see doc)

    // we will tell all of our endpoints by default to use this strategy, this will secure all of our endpoints
    server.auth.default(API_AUTH_STRATEGY);

    server.route([
      //login or register to send the short lived token
      {
        method: 'POST',
        path: '/login',
        handler: loginHandler,
        options: {
          auth: false, //auth false vì endpoint này đc open to user
          validate: {
            failAction: (request, h, err) => {
              throw err;
            },
            payload: Joi.object({
              email: Joi.string().email().required(),
            }),
          },
        },
      },

      //authenticate magiclink and to generate a long lived token
      {
        method: 'POST',
        path: '/authenticate',
        handler: authenticateHandler,
        options: {
          auth: false,
          validate: {
            failAction: (request, h, err) => {
              throw err;
            },
            payload: Joi.object({
              email: Joi.string().email().required(),
              emailToken: Joi.string().required(),
            }),
          },
        },
      },
    ]);
  },
};

export default authPlugin;
