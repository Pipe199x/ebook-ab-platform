import type { Arm } from './types'

const OWNER_PREFIX = 'duel.owner.'
const RANDOM_PREFIX = 'duel.random.'

/**
 * The browser picks the version from a hash of the Duel id and a random number
 * that never leaves the device (§3.13). The random number is kept so a returning
 * reader sees the same version. One version per person.
 */
export function pickArm(duelId: string): Arm {
  const key = RANDOM_PREFIX + duelId
  let seed = localStorage.getItem(key)
  if (!seed) {
    seed = String(crypto.getRandomValues(new Uint32Array(1))[0])
    localStorage.setItem(key, seed)
  }
  // FNV-1a over the pair. Deterministic for one device, balanced across devices.
  let h = 0x811c9dc5
  for (const ch of `${duelId}:${seed}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % 2 === 0 ? 'A' : 'B'
}

/** The owner key arrives in the private link's fragment and lives only on the writer's device. */
export function ownerKeyFor(duelId: string): string | null {
  return localStorage.getItem(OWNER_PREFIX + duelId)
}

export function rememberOwner(duelId: string, ownerKey: string): void {
  localStorage.setItem(OWNER_PREFIX + duelId, ownerKey)
}

/** The writer's own device is never counted (§3.13). */
export function isOwnDuel(duelId: string): boolean {
  return ownerKeyFor(duelId) !== null
}
