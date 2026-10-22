/**
 * The HTTP shapes for the two Wave 2 routes (§3.13). Kept apart from the AWS
 * calls so the answers are testable without a table.
 */
// Explicit .ts extensions: Node runs these files directly through type stripping,
// which does not rewrite specifiers (edge/package.json is type: module).
import { creditFor, nextCard, type Card, type GameStore } from './game.ts'
import { LibraryError, optInFailure, optInLibrary, type OptInCommand } from './library.ts'

export interface Reply {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const JSON_HEADERS = { 'content-type': 'application/json' }

function json(statusCode: number, body: unknown): Reply {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) }
}

/** GET /v1/game/next — one card, never the writer's own Duel. */
export async function gameNext(
  store: GameStore,
  opts: { ownDuelId?: string; recent?: readonly string[] } = {},
  rand: number = Math.random(),
): Promise<Reply> {
  const card = await nextCard(store, opts, rand)
  if (!card) return json(204, null)
  return json(200, toBody(card))
}

/** The card the game shows. No owner key, no answers, no counts. */
function toBody(card: Card) {
  const voteIn = card.duelId
  return {
    duelId: card.duelId,
    kind: card.kind,
    arm: card.arm,
    ...(card.title ? { title: card.title } : {}),
    ...(card.blurb ? { blurb: card.blurb } : {}),
    ...(card.coverUrl ? { coverUrl: card.coverUrl } : {}),
    ...(card.firstPage ? { firstPage: card.firstPage } : {}),
    ...(card.writerLink ? { writerLink: card.writerLink } : {}),
    voteIn,
  }
}

/** What one game vote earns the voter. */
export function gameCredit(voterDuelId: string | undefined, shownDuelId: string) {
  return json(200, { creditFor: creditFor(voterDuelId, shownDuelId) })
}

export interface LibraryDeps {
  put(command: OptInCommand): Promise<void>
  table: string
}

/** POST /v1/duels/{id}/library — the writer opts an ended Duel in. */
export async function libraryOptIn(
  deps: LibraryDeps,
  duelId: string,
  isOwner: boolean,
): Promise<Reply> {
  if (!isOwner) return json(403, { message: 'That private link does not match this Duel.' })
  try {
    await deps.put(optInLibrary(deps.table, duelId))
    return json(200, { ok: true })
  } catch (error) {
    const failure = optInFailure(error)
    return json(failure.status, { message: failure.message })
  }
}

export { LibraryError }
