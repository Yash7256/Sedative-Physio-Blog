type CloudinaryEnv = Record<string, string | undefined>

const CLOUD_NAME_RE = /^[a-z0-9][a-z0-9-]{0,31}$/i
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const FOLDER_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/
const COURSE_TRANSFORM = "f_auto,q_auto,c_fill,w_1200,h_675"

/**
 * Build the public Cloudinary delivery URL for a course preview.
 *
 * The public ID is derived from the validated course slug, never from a DB
 * image string. Missing config or an unsafe ID fails closed so this cannot be
 * turned into an arbitrary external URL.
 */
export function courseCloudinaryImage(
  slug: string | null | undefined,
  env: CloudinaryEnv = import.meta.env as CloudinaryEnv,
): string | null {
  if (!slug || !SLUG_RE.test(slug)) return null

  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ?? ""
  if (!CLOUD_NAME_RE.test(cloudName)) return null

  const configuredFolder = env.VITE_CLOUDINARY_COURSE_FOLDER?.trim()
  const folder = configuredFolder || "courses"
  if (!FOLDER_RE.test(folder)) return null

  return `https://res.cloudinary.com/${cloudName.toLowerCase()}/image/upload/${COURSE_TRANSFORM}/${folder}/${slug}`
}
