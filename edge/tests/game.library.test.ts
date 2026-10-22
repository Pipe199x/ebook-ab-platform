// Run: node --experimental-strip-types --test edge/tests/
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { creditFor, filterPool, nextCard, pickCard, type Card } from '../src/game.ts'
import { optInLibrary } from '../src/library.ts'
import { gameCredit, libraryOptIn } from '../src/handlers.ts'

const card = (duelId: string, arm: 'A' | 'B' = 'A'): Card => ({ duelId, kind: 'cover', arm })

test('pickCard is uniform and total', () => {
  const pool = [card('a'), card('b'), card('c'), card('d')]
  assert.equal(pickCard(pool, 0)?.duelId, 'a')
  assert.equal(pickCard(pool, 0.999999)?.duelId, 'd')
  assert.equal(pickCard(pool, 1)?.duelId, 'd', 'rand 1 must not fall off the end')
  assert.equal(pickCard([], 0.5), null, 'an empty pool is no card, not an error')
})

test('never serves a writer their own Duel', () => {
  const pool = [card('mine'), card('theirs')]
  assert.deepEqual(
    filterPool(pool, { ownDuelId: 'mine' }).map((c) => c.duelId),
    ['theirs'],
  )
})

test('skips Duels the reader just saw', () => {
  const pool = [card('a'), card('b'), card('c')]
  assert.deepEqual(
    filterPool(pool, { recent: ['a', 'b'] }).map((c) => c.duelId),
    ['c'],
  )
})

test('nextCard filters before it picks', async () => {
  const store = { approvedOpenDuels: async () => [card('mine'), card('theirs')] }
  const got = await nextCard(store, { ownDuelId: 'mine' }, 0)
  assert.equal(got?.duelId, 'theirs')
})

test('a game vote earns credit only for another writer’s Duel', () => {
  assert.equal(creditFor('myd', 'theirs'), 'myd')
  assert.equal(creditFor('myd', 'myd'), null, 'your own card earns nothing')
  assert.equal(creditFor(undefined, 'theirs'), null, 'no Duel of your own, no credit')
  assert.equal(gameCredit('myd', 'theirs').statusCode, 200)
})

test('the opt-in is conditional: existing Duel, ended only', () => {
  const cmd = optInLibrary('tbl', 'd1')
  assert.equal(cmd.Key.PK, 'DUEL#d1')
  assert.match(cmd.ConditionExpression, /attribute_exists\(PK\)/)
  assert.match(cmd.ConditionExpression, /#status = :ended/)
  assert.equal(cmd.ExpressionAttributeValues[':ended'], 'ENDED')
})

test('a Duel that has not ended is refused, not silently skipped', async () => {
  const put = async () => {
    const e = new Error('conditional') as Error & { name: string }
    e.name = 'ConditionalCheckFailedException'
    throw e
  }
  const reply = await libraryOptIn({ put, table: 'tbl' }, 'd1', true)
  assert.equal(reply.statusCode, 409)
})

test('a wrong owner key never reaches the table', async () => {
  let called = false
  const reply = await libraryOptIn(
    {
      put: async () => {
        called = true
      },
      table: 'tbl',
    },
    'd1',
    false,
  )
  assert.equal(reply.statusCode, 403)
  assert.equal(called, false)
})

test('the opt-in succeeds once and says so', async () => {
  const reply = await libraryOptIn({ put: async () => {}, table: 'tbl' }, 'd1', true)
  assert.equal(reply.statusCode, 200)
  assert.deepEqual(JSON.parse(reply.body), { ok: true })
})
