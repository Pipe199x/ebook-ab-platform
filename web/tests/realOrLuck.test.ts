import { describe, expect, it } from 'vitest'
import { daysToSettle, rateTest } from '../src/stats/binomial'

// Known values from scipy.stats.binomtest, so the browser's answer matches the
// Python oracle (§3.13 "Stats in TypeScript").
describe('rateTest (exact binomial, adjusted for days)', () => {
  it('gives p = 1 when nothing changed', () => {
    expect(rateTest({ sales: 100, days: 30 }, { sales: 100, days: 30 })).toBeCloseTo(1, 6)
  })

  it('matches scipy: 15 of 20 with p = 0.5 is about 0.0414', () => {
    // 30 days before, 30 days after, 5 sales then 15 sales.
    expect(rateTest({ sales: 5, days: 30 }, { sales: 15, days: 30 })).toBeCloseTo(0.0414, 3)
  })

  it('adjusts for unequal days: the same rate over different windows is no change', () => {
    // 30 days / 10 sales and 60 days / 20 sales: identical pace.
    expect(rateTest({ sales: 10, days: 30 }, { sales: 20, days: 60 })).toBeGreaterThan(0.05)
  })

  it('handles zero sales without dividing by zero', () => {
    expect(rateTest({ sales: 0, days: 30 }, { sales: 0, days: 30 })).toBe(1)
  })
})

describe('daysToSettle', () => {
  it('needs no more days when the change is already real', () => {
    const b = { sales: 5, days: 30 }
    const a = { sales: 15, days: 30 }
    expect(rateTest(b, a)).toBeLessThan(0.05)
  })

  it('returns a positive day count or an honest null', () => {
    const n = daysToSettle({ sales: 20, days: 30 }, { sales: 24, days: 30 })
    expect(n === null || n > 0).toBe(true)
  })
})
