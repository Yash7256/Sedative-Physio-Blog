const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ""
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER ?? ""
const GITHUB_REPO = process.env.GITHUB_REPO_NAME ?? ""
const GITHUB_BRANCH = process.env.GITHUB_REPO_BRANCH ?? "main"

const API_BASE = "https://api.github.com"

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

export function githubConfigured(): boolean {
  return Boolean(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO)
}

export function jsDelivrUrl(path: string): string {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`
}

interface GitHubFileResponse {
  sha: string
  content?: { download_url?: string }
}

export async function getFileSha(path: string): Promise<string> {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub GET failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as GitHubFileResponse
  return data.sha
}

interface RepoTreeEntry {
  path?: string
  type?: string
  size?: number
}

/**
 * List all .glb files in the repository (recursively) via the Git trees API,
 * including their byte size.
 */
export async function listRepoModelFiles(): Promise<{ path: string; size: number }[]> {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub tree GET failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { tree?: RepoTreeEntry[] }
  const files = (data.tree ?? []).filter(
    (entry) => entry.type === "blob" && entry.path?.toLowerCase().endsWith(".glb"),
  )
  return files.map((entry) => ({
    path: entry.path!,
    size: entry.size ?? 0,
  }))
}

export async function uploadFile(path: string, buffer: Buffer): Promise<void> {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
  const payload = {
    message: `Upload ${path}`,
    content: buffer.toString("base64"),
    branch: GITHUB_BRANCH,
  }
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub upload failed (${res.status}): ${body}`)
  }
}

export async function deleteFile(path: string): Promise<void> {
  const sha = await getFileSha(path)
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
  const payload = {
    message: `Delete ${path}`,
    sha,
    branch: GITHUB_BRANCH,
  }
  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub delete failed (${res.status}): ${body}`)
  }
}
