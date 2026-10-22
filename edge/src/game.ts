/**
 * The game (§3.13, L2): "Which would you read?". One random version from
 * another writer's Duel per card. Each vote counts in that Duel and earns one
 * vote for the voter's own.
 *
 * Pure decisions live here so they can be tested without AWS; the store is
 * passed in, so the Lambda stays a couple of lines.
 */

export type Arm = 'A' | 'B'

export interface Candidate {
  duelId: string
  kind: 'cover' | 'title' | 'blurb' | 'idea'
  /** The arm this card shows. The browser's version pick is not involved. */
  arm: Arm
  title?: string
  blurb?: string
  coverUrl?: string
}

export interface Card extends Candidate {
  firstPage?: string
  writerLink?: string
}

/** Uniform over the approved, open Duels. `rand` is injected so tests are exact. */
export function pickCard(pool: readonly Card[], rand: number = Math.random()): Card | null {
  if (pool.length === 0) return null
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rand * pool.length)))
  return pool[i]
}

/**
 * A game vote is one vote in the shown Duel and one credit toward the voter's
 * own. No credit when the voter has no Duel of their own, or when they are
 * looking at their own card (§3.13: the writer's own device never counts).
 */
export function creditFor(voterDuelId: string | undefined, shownDuelId: string): string | null {
  if (!voterDuelId || voterDuelId === shownDuelId) return null
  return voterDuelId
}

/** Never serve a writer their own Duel, never a 4th card from the same Duel in a row. */
export function filterPool(
  pool: readonly Card[],
  opts: { ownDuelId?: string; recent?: readonly string[] } = {},
): Card[] {
  const recent = opts.recent ?? []
  return pool.filter((c) => c.duelId !== opts.ownDuelId && !recent.includes(c.duelId))
}

export interface GameStore {
  approvedOpenDuels(limit: number): Promise<Card[]>
}

const MAX_CANDIDATES = 50

export async function nextCard(
  store: GameStore,
  opts: { ownDuelId?: string; recent?: readonly string[] } = {},
  rand: number = Math.random(),
): Promise<Card | null> {
  const pool = filterPool(await store.approvedOpenDuels(MAX_CANDIDATES), opts)
  return pickCard(pool, rand)
}
