import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "./config.js";

const client = new S3Client({
  region: "auto",
  endpoint: config.s3Endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: config.s3Key, secretAccessKey: config.s3SecretKey },
});

export async function savePhoto(buffer: Buffer, key: string): Promise<string> {
  await client.send(new PutObjectCommand({
    Bucket: config.s3BucketName,
    Key: key,
    Body: buffer,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${config.s3Url.replace(/\/+$/, "")}/${key}`;
}

export async function deletePhoto(key: string): Promise<void> {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.s3BucketName, Key: key }));
  } catch (error) {
    console.error("Photo object deletion failed", error instanceof Error ? error.name : "UnknownError");
  }
}
