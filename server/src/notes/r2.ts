import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const accountId = process.env.R2_ACCOUNT_ID ?? ""
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? ""
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? ""
export const r2Bucket = process.env.R2_BUCKET_NAME ?? "sedative-physio-notes"

const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
})

export function r2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey)
}

/** Generate a short-lived presigned GET URL for an object key. */
export function getObjectUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: r2Bucket, Key: key }),
    { expiresIn },
  )
}