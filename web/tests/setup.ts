import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Loads the i18next instance once for the whole run.
import '../src/i18n'

/** A minimal stand-in. jsdom does not always expose a global Response. */
export function json(value: unknown, ok = true) {
  return { ok, status: ok ? 200 : 404, json: async () => value } as unknown as Response
}

beforeEach(() => {
  // Home reads /data/library.json. Node's fetch rejects a relative URL, so tests
  // must never reach it. 404 by default: the counter stays quiet.
  vi.stubGlobal('fetch', vi.fn(async () => json({}, false)))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
