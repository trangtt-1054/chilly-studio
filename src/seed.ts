//dùng để fill data to postgresdb

import { PrismaClient } from '@prisma/client';
import { add } from 'date-fns';

const prisma = new PrismaClient();

// A `main` function so that we can use async/await, because we need to communicate with the database so we need async function
async function main() {
  await prisma.user.deleteMany({}); //should not be done in production, cho đỡ bị lỗi unique constraint

  const user = await prisma.user.create({
    data: {
      email: 'trang@hey.com',
      firstName: 'Trang',
      lastName: 'Thu',
      social: {
        facebook: 'trang.sachi',
        twitter: 'thutrangBC',
      },
    },
  });

  console.log(user);
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Disconnect Prisma Client
    await prisma.$disconnect(); //nếu ko disconnect mà run script thì bị event loop, script won't exist, it's a good practice to disconnect at the end of a one-shot-type script
  });
