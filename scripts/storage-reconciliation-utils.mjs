import { ListObjectsV2Command } from "@aws-sdk/client-s3";

/** Read every S3 page; a first-page count is not a complete reconciliation. */
export async function listAllBucketObjects(client, bucket) {
  const objects = [];
  const seenTokens = new Set();
  let token;
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket, ...(token ? { ContinuationToken: token } : {}),
    }));
    for (const object of response.Contents ?? []) {
      if (typeof object.Key !== "string" || !Number.isFinite(object.Size)) {
        throw new Error(`Invalid target object metadata for ${bucket}.`);
      }
      objects.push({ bucket, key: object.Key, size: object.Size });
    }
    if (!response.IsTruncated) break;
    token = response.NextContinuationToken;
    if (!token || seenTokens.has(token)) throw new Error(`Incomplete target listing for ${bucket}.`);
    seenTokens.add(token);
  } while (true);
  return objects;
}

export function compareStorageObjectInventory(sourceObjects, targetObjects) {
  const identity = (bucket, key) => JSON.stringify([bucket, key]);
  const source = new Map(sourceObjects.map(object => [identity(object.bucket_id, object.name), object]));
  const target = new Map(targetObjects.map(object => [identity(object.bucket, object.key), object]));
  return {
    missingTargetObjects: [...source.keys()].filter(key => !target.has(key)).length,
    extraTargetObjects: [...target.keys()].filter(key => !source.has(key)).length,
    sourceObjectCount: sourceObjects.length,
    targetObjectCount: targetObjects.length,
  };
}
