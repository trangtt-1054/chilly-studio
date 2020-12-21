//a plugin for prisma: access Prisma from other plugins

import Hapi from "@hapi/hapi";
import { PrismaClient } from "@prisma/client";

//property `prisma` does not exist on type SErverApplicationState => use a technique called Module Augmentation https://www.digitalocean.com/community/tutorials/typescript-module-augmentation, which means extending a existing type
declare module "@hapi/hapi" {
  interface ServerApplicationState {
    prisma: PrismaClient;
  }
}

const prismaPlugin: Hapi.Plugin<undefined> = {
  name: "prisma",
  register: async function (server: Hapi.Server) {
    const prisma = new PrismaClient();

    //make prisma client accessible throughout the app, a place to store server-specific without potential conflicts with framework internal
    server.app.prisma = prisma;

    //we want to extensions fnc to make sure this happens only onces after server stops => use extension function of hapi, extension function is like a hook function, gets called when a certain event happens
    //prisma.$disconnect()
    server.ext({
      type: "onPostStop",
      method: async (server: Hapi.Server) => {
        server.app.prisma.$disconnect();
      },
    });
  },
};

export default prismaPlugin;
