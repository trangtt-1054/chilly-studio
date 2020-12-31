import { createServer } from "../src/server";
import Hapi, { AuthCredentials } from "@hapi/hapi";
import { add } from "date-fns";
import { createCollectionRecordViewerOwner } from "./test-helpers";
import { API_AUTH_STRATEGY } from "../src/plugins/auth";

describe("record-rates endpoints", () => {
  let server: Hapi.Server;
  let ownerCredentials: AuthCredentials;
  let viewerCredentials: AuthCredentials;
  let collectionId: number;
  let recordId: number;
  let viewerId: number;
  let ownerId: number;
  let recordRateId: number;

  beforeAll(async () => {
    server = await createServer();
    // create a collection, an associated record, and two users (viewer and owner) to assign record rates to
    const testData = await createCollectionRecordViewerOwner(server.app.prisma);

    collectionId = testData.collectionId;
    recordId = testData.recordId;
    viewerId = testData.viewerId;
    ownerId = testData.ownerId;
    ownerCredentials = testData.ownerCredentials;
    viewerCredentials = testData.viewerCredentials;
  });

  afterAll(async () => {
    await server.stop();
  });

  test("create record rates", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/collections/records/{recordId}/record-rates",
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: ownerCredentials,
      },
      payload: {
        point: 500,
      },
    });
    expect(response.statusCode).toEqual(201);
    const recordRate = JSON.parse(response.payload);
    expect(typeof recordRate === "number").toBeTruthy();
  });
});
