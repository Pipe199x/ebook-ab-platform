import type {
  Answer,
  Arm,
  CreateDuelBody,
  CreateDuelResponse,
  Duel,
  Progress,
  Result,
} from './types'

/**
 * All Duel routes live under /v1 on our own origin (CloudFront -> the duel-api
 * function URL). Same origin, so no CORS and no credential in the browser (D12).
 *
 * A Lambda function URL behind CloudFront + OAC needs the SHA-256 of every POST
 * body in x-amz-content-sha256 (§3.13). GETs do not need it.
 */
const BASE = '/v1'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function post<T>(path: string, body: unknown, ownerKey?: string): Promise<T> {
  const text = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-amz-content-sha256': await sha256Hex(text),
      ...(ownerKey ? { 'x-owner-key': ownerKey } : {}),
    },
    body: text,
  })
  if (!res.ok) throw new ApiError(res.status, await problem(res))
  return res.json() as Promise<T>
}

async function get<T>(path: string, ownerKey?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: ownerKey ? { 'x-owner-key': ownerKey } : {},
  })
  if (!res.ok) throw new ApiError(res.status, await problem(res))
  return res.json() as Promise<T>
}

/** 429 is throttling. §3.13 gives the exact wording. */
async function problem(res: Response): Promise<string> {
  if (res.status === 429) return 'Lots of readers right now. Try again in a minute.'
  try {
    const data = (await res.json()) as { message?: string }
    if (data.message) return data.message
  } catch {
    /* not JSON; fall through */
  }
  return `Something went wrong (${res.status}).`
}

/**
 * Straight to S3 with a presigned POST (D35, D49). S3's own form signature covers
 * this request, so x-amz-content-sha256 is not needed here; that header is only for
 * our Lambda function URL behind CloudFront+OAC.
 */
export async function uploadCover(
  url: string,
  fields: Record<string, string>,
  blob: Blob,
): Promise<void> {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('file', blob)
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new ApiError(res.status, 'Cover upload failed. Try again.')
}

export const api = {
  createDuel: (body: CreateDuelBody) => post<CreateDuelResponse>('/duels', body),

  getDuel: (id: string) => get<Duel>(`/duels/${id}`),

  vote: (id: string, arm: Arm, answer: Answer) =>
    post<{ ok: true }>(`/duels/${id}/votes`, { arm, answer }),

  progress: (id: string, ownerKey: string) => get<Progress>(`/duels/${id}/progress`, ownerKey),

  result: (id: string, ownerKey: string) => get<Result>(`/duels/${id}/result`, ownerKey),

  addToLibrary: (id: string, ownerKey: string) =>
    post<{ ok: true }>(`/duels/${id}/library`, {}, ownerKey),
}
