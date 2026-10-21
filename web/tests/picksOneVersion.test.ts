import { describe, expect, it } from 'vitest'
import { isOwnDuel, ownerKeyFor, pickArm, rememberOwner } from '../src/visitor'

// §3.13: the browser picks the version from a hash of the Duel and a random
// number that never leaves the device. One version per person.
describe('pickArm', () => {
  it('gives the same version to the same device on a second visit', () => {
    const first = pickArm('duel-1')
    for (let i = 0; i < 10; i++) expect(pickArm('duel-1')).toBe(first)
  })

  it('can give both versions across different devices', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      localStorage.clear()
      seen.add(pickArm('duel-x'))
    }
    expect(seen).toEqual(new Set(['A', 'B']))
  })

  it('never throws on an odd id (FNV-1a is total)', () => {
    expect(['A', 'B']).toContain(pickArm(''))
  })
})

describe('owner key', () => {
  it('stays on the device and marks the writer', () => {
    rememberOwner('d9', 'ok-123')
    expect(ownerKeyFor('d9')).toBe('ok-123')
    expect(isOwnDuel('d9')).toBe(true)
    expect(isOwnDuel('other')).toBe(false)
  })
})
