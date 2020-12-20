//dùng để fill data to postgresdb

import { PrismaClient } from '@prisma/client';
import { add } from 'date-fns';

const prisma = new PrismaClient();

// A `main` function so that we can use async/await, because we need to communicate with the database so we need async function
async function main() {
  await prisma.collectionByUser.deleteMany({});
  await prisma.recordRate.deleteMany({});
  await prisma.user.deleteMany({}); //should not be done in production, cho đỡ bị lỗi unique constraint
  await prisma.record.deleteMany({}); //chú ý thứ tự, phải delete record trc rồi mới delete collection
  await prisma.collection.deleteMany({});

  const trang = await prisma.user.create({
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

  //console.log(user);

  const weekFromNow = add(new Date(), { days: 7 });
  const twoWeekFromNow = add(new Date(), { days: 14 });
  const monthFromNow = add(new Date(), { days: 28 });

  const collection = await prisma.collection.create({
    data: {
      name: 'Good old mangas',
      details: 'Some underestimated mangas in the olden days',
      records: {
        //connect: allow us to connect an already existing record, but in this case we want to create, you can create one or multiple in 1 transaction
        create: [
          {
            date: weekFromNow,
            name: 'Yuyu Hakusho',
          },
          {
            date: twoWeekFromNow,
            name: 'Psyren',
          },
          {
            date: monthFromNow,
            name: 'Ouke no Monshou',
          },
        ],
      },
      members: {
        create: {
          role: 'ADMIN',
          user: {
            //connect to `trang` user that was created above
            connect: { email: trang.email },
          },
        },
      },
    },
    //include: select additional fields, by default we only get scalar fields, in order to fetch relations, we have to use `include`
    include: {
      records: true,
      members: { include: { user: true } },
    },
  });

  const andy = await prisma.user.create({
    data: {
      email: 'andy@hey.com',
      firstName: 'Andy',
      lastName: 'Boss',
      social: {
        facebook: 'andromache',
        twitter: 'andromache',
      },
      collections: {
        create: {
          role: 'MEMBER',
          collection: {
            connect: { id: collection.id },
          },
        },
      },
    },
  });

  const memphis = await prisma.user.create({
    data: {
      email: 'memphis@hey.com',
      firstName: 'Memphis',
      lastName: 'Isis',
      social: {
        facebook: 'memphis.nile',
        twitter: 'memphis.nile',
      },
      collections: {
        create: {
          role: 'MEMBER',
          collection: {
            connect: { id: collection.id },
          },
        },
      },
    },
  });

  const points = [50, 100, 200];

  let counter = 0;
  for (const record of collection.records) {
    const rateOfAndy = await prisma.recordRate.create({
      data: {
        gradedBy: { connect: { email: trang.email } },
        member: { connect: { email: andy.email } },
        record: { connect: { id: record.id } },
        point: points[counter],
      },
    });
    counter++;
  }

  const rates = await prisma.recordRate.aggregate({
    where: { memberId: andy.id },
    avg: { point: true },
    max: { point: true },
    min: { point: true },
    count: true,
  });

  console.log(rates);

  //console.log(collection);
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
