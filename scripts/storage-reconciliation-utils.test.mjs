import assert from "node:assert/strict";
import test from "node:test";
import { listAllBucketObjects, compareStorageObjectInventory } from "./storage-reconciliation-utils.mjs";

test("lists every target page without skipping objects", async () => {
  const requests = [];
  const client = { send: async command => {
    requests.push(command.input);
    return requests.length === 1
      ? { Contents: [{ Key: "a", Size: 10 }], IsTruncated: true, NextContinuationToken: "next" }
      : { Contents: [{ Key: "b", Size: 20 }], IsTruncated: false };
  } };
  const objects = await listAllBucketObjects(client, "college-media");
  assert.deepEqual(objects.map(object => object.key), ["a", "b"]);
  assert.equal(requests[1].ContinuationToken, "next");
});

test("fails closed on a truncated listing without a new continuation token", async () => {
  const client = { send: async () => ({ Contents: [], IsTruncated: true }) };
  await assert.rejects(listAllBucketObjects(client, "college-media"), /Incomplete target listing/);
});

test("detects source and target identity drift independently of counts", () => {
  assert.deepEqual(compareStorageObjectInventory(
    [{ bucket_id: "media", name: "a" }, { bucket_id: "media", name: "b" }],
    [{ bucket: "media", key: "a", size: 1 }, { bucket: "media", key: "c", size: 1 }]),
  { missingTargetObjects: 1, extraTargetObjects: 1, sourceObjectCount: 2, targetObjectCount: 2 });
});
