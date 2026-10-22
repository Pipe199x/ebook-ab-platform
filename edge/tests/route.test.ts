import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type { Card } from '../src/game.ts'
import { route, type RouteDeps } from '../src/route.ts'

const card: Card = { duelId: 'theirs', kind: 'cover', arm: 'B', coverUrl: 'https://x/c.jpg' }

function deps(over: Partial<RouteDeps> = {}): RouteDeps {
  return {
    table: 'tbl',
    put: async () => {},
    isOwner: async () => true,
    game: { approvedOpenDuels: async () => [card] },
    ...over,
  }
}

test('GET /v1/game/next serves one card and where its vote counts', async () => {
  const reply = await route(deps(), { rawPath: '/v1/game/next', httpMethod: 'GET' })
  assert.equal(reply.statusCode, 200)
  assert.deepEqual(JSON.parse(reply.body), { ...card, voteIn: 'theirs' })
})

test('the game route passes own and recent through to the filter', async () => {
  const reply = await route(
    deps({ game: { approvedOpenDuels: async () => [{ ...card, duelId: 'mine' }] } }),
    {
      rawPath: '/v1/game/next',
      httpMethod: 'GET',
      queryStringParameters: { own: 'mine', recent: 'a,b' },
    },
  )
  assert.equal(reply.statusCode, 204, 'only your own Duel left: no card, not an error')
})

test('POST /v1/duels/{id}/library needs the owner key', async () => {
  const depsNo = deps({ isOwner: async () => false })
  const denied = await route(depsNo, { rawPath: '/v1/duels/d1/library', httpMethod: 'POST' })
  assert.equal(denied.statusCode, 403)
})

test('POST /v1/duels/{id}/library opts in with the right key, case-insensitive header', async () => {
  let seen: string | undefined
  const ok = await route(
    deps({ isOwner: async (_id, key) => ((seen = key), true) }),
    {
      rawPath: '/v1/duels/d1/library',
      httpMethod: 'POST',
      headers: { 'X-Owner-Key': 'k123' },
    },
  )
  assert.equal(ok.statusCode, 200)
  assert.equal(seen, 'k123')
})

test('an unknown route is 404', async () => {
  const reply = await route(deps(), { rawPath: '/v1/nope', httpMethod: 'GET' })
  assert.equal(reply.statusCode, 404)
})
