import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.MINIO_ENDPOINT!;
const bucket = process.env.MINIO_BUCKET || "kupiauto";

export const s3 = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint,
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY!,
  },
});

export const MINIO_BUCKET = bucket;

let bucketReady = false;

/** Ensure the bucket exists and is publicly readable (idempotent). */
export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      }),
    );
  }
  bucketReady = true;
}

/** Public URL for an object key. */
export function publicUrl(key: string): string {
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;
}

/** Generate a presigned PUT URL for direct browser upload. */
export async function presignUpload(
  key: string,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 600 });
}

/** Upload bytes directly from the server. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Deletes many objects, 1000 per request (the S3 limit). Best-effort: returns
 *  how many keys could not be removed instead of throwing, because by the time
 *  this runs the rows pointing at them are already gone, and an orphaned photo
 *  costs storage while a thrown error would make a finished delete look failed. */
export async function deleteObjects(keys: string[]): Promise<{ failed: number }> {
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) batches.push(keys.slice(i, i + 1000));
  let failed = 0;
  // A few at a time: a big dealer is ~20 batches, and MinIO is fine with this.
  for (let i = 0; i < batches.length; i += 4) {
    const results = await Promise.allSettled(
      batches.slice(i, i + 4).map((batch) =>
        s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
        ),
      ),
    );
    results.forEach((r, j) => {
      const size = batches[i + j].length;
      if (r.status === "rejected") failed += size;
      else failed += r.value.Errors?.length ?? 0;
    });
  }
  return { failed };
}
