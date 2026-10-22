import { describe, expect, it } from 'vitest'
import { betaCdf } from '../src/stats/beta'
import { analyzeCsv, money, parseCsv } from '../src/adDoctor/report'

// Exact values for integer parameters, from the binomial identity
// I_x(a,b) = Σ_{j=a}^{a+b-1} C(a+b-1, j) x^j (1-x)^(a+b-1-j).
describe('betaCdf', () => {
  it('matches the closed form at well-behaved points', () => {
    expect(betaCdf(0.5, 2, 3)).toBeCloseTo(0.6875, 6)
    expect(betaCdf(0.2, 5, 5)).toBeCloseTo(0.01958144, 8)
    expect(betaCdf(0.2, 2, 3)).toBeCloseTo(0.1808, 6)
    expect(betaCdf(0.9, 20, 2)).toBeCloseTo(0.36473, 5)
    // (2/π)·arcsin(1/10) for Beta(1/2, 1/2), the arcsine law.
    expect(betaCdf(0.01, 0.5, 0.5)).toBeCloseTo(0.0637686, 5)
  })

  it('is symmetric under (a,b) → (b,a) and x → 1-x', () => {
    expect(betaCdf(0.3, 10, 10)).toBeCloseTo(1 - betaCdf(0.7, 10, 10), 9)
    expect(betaCdf(0.5, 5, 5)).toBeCloseTo(0.5, 9)
  })

  it('reaches both edges exactly', () => {
    expect(betaCdf(0, 2, 3)).toBe(0)
    expect(betaCdf(1, 2, 3)).toBe(1)
  })
})

describe('parseCsv', () => {
  it('reads quoted cells with escaped quotes and commas inside them', () => {
    const rows = parseCsv('a,b\n"x, y","he said ""hi"""\n')
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ])
  })

  it('uses semicolons when they outnumber commas (Spanish exports)', () => {
    expect(parseCsv('a;b\n1;2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('drops blank rows', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toHaveLength(2)
  })
})

describe('money', () => {
  it('reads both decimal conventions', () => {
    expect(money('$1,234.56')).toBeCloseTo(1234.56, 2)
    expect(money('1.234,56')).toBeCloseTo(1234.56, 2)
    expect(money('12,50')).toBeCloseTo(12.5, 2)
    expect(money('')).toBe(0)
    expect(money('n/a')).toBe(0)
  })
})

// §3.13: Stop (≥ 10 clicks, 90% sure it earns less than it costs), Keep (≥ 10
// clicks, 90% sure it earns more), Luck (< 15 clicks but looks great), Wait.
describe('analyzeCsv', () => {
  const header = 'Campaign Name,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Orders (#),7 Day Total Sales\n'
  const report = (rows: string) => header + rows

  it('stops a keyword that spends more than it earns, with enough clicks', () => {
    // 40 clicks, $40 spent, 0 sales, $5 royalty: break-even 20%.
    const r = analyzeCsv(report('X,expensive term,1000,40,$40.00,0,$0.00\n'), 5, 30)
    expect(r?.keywords[0].verdict).toBe('stop')
    expect(r?.counts.stop).toBe(1)
  })

  it('keeps a keyword that clearly earns more than it costs', () => {
    const r = analyzeCsv(report('X,winners,1000,40,$40.00,20,$99.80\n'), 5, 30)
    expect(r?.keywords[0].verdict).toBe('keep')
  })

  it('calls luck on a great start with too few clicks to trust', () => {
    // 3 clicks, 2 sales: better than break-even, but under 15 clicks.
    const r = analyzeCsv(report('X,lucky,100,3,$3.00,2,$9.98\n'), 5, 30)
    expect(r?.keywords[0].verdict).toBe('luck')
  })

  it('waits when the clicks cannot settle it yet, and says how many more', () => {
    // The bulk keyword sets the book's average; the second sits just above its
    // 14% break-even, with 16 clicks: not yet 90% sure either way.
    const r = analyzeCsv(
      report('X,bulk,1000,100,$50.00,10,$24.95\nX,unsure,1000,16,$11.00,4,$9.98\n'),
      5,
      30,
    )
    const k = r?.keywords.find((kw) => kw.term === 'unsure')
    expect(k?.verdict).toBe('wait')
    expect(k?.more).toBeGreaterThan(0)
  })

  it('turns the stopped spend into a monthly headline', () => {
    // $30 stopped over 15 days = $60 a month.
    const r = analyzeCsv(report('X,bad,1000,40,$30.00,0,$0.00\n'), 5, 15)
    expect(r?.savePerMonth).toBeCloseTo(60, 6)
  })

  it('reads the Spanish header row, wherever it starts', () => {
    const text = 'Informe de términos de búsqueda\nTérmino de búsqueda;Clics;Gasto;Pedidos totales\nmalo;40;40,00;0\n'
    const r = analyzeCsv(text, 5, 30)
    expect(r?.keywords[0]).toMatchObject({ term: 'malo', clicks: 40, spend: 40 })
  })

  it('refuses a file it cannot read instead of guessing', () => {
    expect(analyzeCsv('nothing,useful\n1,2\n', 5, 30)).toBeNull()
    expect(analyzeCsv(header, 5, 30)).toBeNull()
  })

  it('sums repeated search terms across ad groups into one keyword', () => {
    const r = analyzeCsv(
      report('X,same term,100,20,$20.00,0,$0.00\nY,same term,100,20,$20.00,0,$0.00\n'),
      5,
      30,
    )
    expect(r?.keywords).toHaveLength(1)
    expect(r?.keywords[0].clicks).toBe(40)
  })
})
