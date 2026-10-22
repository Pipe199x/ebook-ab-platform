/**
 * Route table for the two Wave 2 routes (§3.13). The duel-api Lambda owns the
 * whole /v1 surface; this file only says which of those routes Wave 2 added and
 * what they do, so the Lambda stays a thin adapter over DynamoDB.
 */
import { gameNext, libraryOptIn, type Reply } from './handlers.ts'
import type { GameStore } from './game.ts'
import type { OptInCommand } from './library.ts'

export interface RouteDeps {
  game: GameStore
  table: string
  put(command: OptInCommand): Promise<void>
  /** Compare the caller's x-owner-key against the stored hash. */
  isOwner(duelId: string, ownerKey: string | undefined): Promise<boolean>
}

const LIBRARY = /^\/v1\/duels\/([^/]+)\/library$/

function header(event: { headers?: Record<string, string | undefined> }, name: string) {
  const headers = event.headers ?? {}
  const key = Object.keys(headers).find((h) => h.toLowerCase() === name)
  return key ? headers[key] : undefined
}

/**
 * Unknown paths return 404, not 500: a wrong URL is the caller's mistake, and
 * a 500 would page someone.
 */
export async function route(
  deps: RouteDeps,
  event: {
    rawPath?: string
    httpMethod?: string
    headers?: Record<string, string | undefined>
    queryStringParameters?: Record<string, string | undefined> | null
  },
): Promise<Reply> {
  const path = event.rawPath ?? '/'
  const method = (event.httpMethod ?? 'GET').toUpperCase()

  if (method === 'GET' && path === '/v1/game/next') {
    const q = event.queryStringParameters ?? {}
    return gameNext(deps.game, {
      ownDuelId: q.own,
      recent: q.recent ? q.recent.split(',').filter(Boolean) : undefined,
    })
  }

  const optIn = LIBRARY.exec(path)
  if (method === 'POST' && optIn) {
    const duelId = decodeURIComponent(optIn[1])
    const ownerKey = header(event, 'x-owner-key')
    return libraryOptIn(deps, duelId, await deps.isOwner(duelId, ownerKey))
  }

  return {
    statusCode: 404,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Not found.' }),
  }
}
