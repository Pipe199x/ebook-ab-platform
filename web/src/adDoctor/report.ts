/**
 * The Ad Doctor (§3.13, L3): reads an Amazon Ads search-term report and says
 * what to Stop, Keep, treat as Luck or Wait on. It all runs in the browser, so
 * the writer's report never leaves the device (D24).
 *
 * The model is the one in the plan: a beta-binomial per keyword, each keyword
 * starting from the book's own average as if it already had 20 clicks.
 */
import { betaCdf } from '../stats/beta'

export type Verdict = 'stop' | 'keep' | 'luck' | 'wait'

export interface Keyword {
  term: string
  clicks: number
  spend: number
  orders: number
  /** Break-even: the share of clicks that must sell to pay for themselves. */
  breakEven: number
  /** one sale every `every` clicks is the line this keyword must beat. */
  every: number
  verdict: Verdict
  /** For 'wait': about how many more clicks would settle it. */
  more?: number
}

export interface Analysis {
  keywords: Keyword[]
  counts: Record<Verdict, number>
  /** The headline: about this many US dollars a month can be stopped. */
  savePerMonth: number
  average: number
}

const SURE = 0.9
const STRONG = 0.05
const PSEUDO_CLICKS = 20
const MIN_CLICKS = 10
const LUCK_CLICKS = 15
const DAYS_PER_MONTH = 30

/**
 * Quoted fields, `""` escapes, and either `,` or `;` as the delimiter. Amazon
 * exports put a title line or two above the header, so the delimiter is counted
 * on the header row itself, not on the first line.
 */
export function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  const headerLine = lines.find((l) => /click|clic/i.test(l)) ?? lines[0] ?? ''
  const commas = (headerLine.match(/,/g) ?? []).length
  const semicolons = (headerLine.match(/;/g) ?? []).length
  const delim = semicolons > commas ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** "1.234,56" or "$1,234.56" or "12,50" → a number. */
export function money(raw: string | undefined): number {
  let x = String(raw ?? '').replace(/[^\d.,-]/g, '')
  if (x.includes(',') && x.includes('.')) {
    x =
      x.lastIndexOf(',') > x.lastIndexOf('.')
        ? x.replace(/\./g, '').replace(',', '.')
        : x.replace(/,/g, '')
  } else if (x.includes(',')) {
    x = /,\d{1,2}$/.test(x) ? x.replace(',', '.') : x.replace(/,/g, '')
  }
  const n = Number.parseFloat(x)
  return Number.isFinite(n) ? n : 0
}

interface Columns {
  term: number
  clicks: number
  spend: number
  orders: number
}

/** Amazon Ads ships English or Spanish headers; the header row is not always the first. */
function findColumns(rows: string[][]): (Columns & { row: number }) | null {
  for (let h = 0; h < rows.length; h++) {
    const head = rows[h].map((c) => c.trim().toLowerCase())
    if (!head.some((c) => /click|clic/.test(c))) continue
    const at = (...keys: string[]) => head.findIndex((col) => keys.some((k) => col.includes(k)))
    const cols = {
      term: at('customer search term', 'término de búsqueda', 'termino de busqueda', 'search term', 'targeting', 'segmentación'),
      clicks: at('clicks', 'clics'),
      spend: at('spend', 'gasto', 'inversión', 'inversion'),
      orders: at('total orders', 'pedidos totales', 'orders', 'pedidos'),
    }
    if (Object.values(cols).some((i) => i < 0)) continue
    return { ...cols, row: h }
  }
  return null
}

/**
 * @param royalty what the writer earns per sale, in the report's currency
 * @param days how many days the report covers (for the monthly headline)
 */
export function analyzeCsv(text: string, royalty: number, days: number): Analysis | null {
  const rows = parseCsv(text)
  const found = findColumns(rows)
  if (!found) return null
  const { row: headerRow, ...cols } = found as Columns & { row: number }

  const byTerm = new Map<string, { term: string; clicks: number; spend: number; orders: number }>()
  for (const r of rows.slice(headerRow + 1)) {
    const term = (r[cols.term] ?? '').trim()
    if (!term) continue
    const k = byTerm.get(term) ?? { term, clicks: 0, spend: 0, orders: 0 }
    k.clicks += money(r[cols.clicks])
    k.spend += money(r[cols.spend])
    k.orders += money(r[cols.orders])
    byTerm.set(term, k)
  }

  // Keywords with no clicks say nothing about the click-to-sale rate.
  const base = [...byTerm.values()].filter((k) => k.clicks > 0)
  if (base.length === 0) return null

  const totalClicks = base.reduce((s, k) => s + k.clicks, 0)
  const totalOrders = base.reduce((s, k) => s + k.orders, 0)
  const totalSpend = base.reduce((s, k) => s + k.spend, 0)

  // The book's own average is the starting point for every keyword.
  const average = Math.min(0.9, Math.max(STRONG, totalOrders / totalClicks))
  const a0 = average * PSEUDO_CLICKS
  const b0 = (1 - average) * PSEUDO_CLICKS
  const fallbackCpc = totalSpend / totalClicks
  const perSale = royalty > 0 ? royalty : 1

  const keywords: Keyword[] = base.map((k) => {
    const cpc = k.spend / k.clicks || fallbackCpc
    const breakEven = Math.min(0.99, cpc / perSale)
    const every = Math.max(1, Math.round(1 / breakEven))
    const a = a0 + k.orders
    const b = b0 + (k.clicks - k.orders)
    const below = betaCdf(breakEven, a, b)

    let verdict: Verdict
    let more: number | undefined
    if (k.clicks >= MIN_CLICKS && below >= SURE) verdict = 'stop'
    else if (k.clicks >= MIN_CLICKS && 1 - below >= SURE) verdict = 'keep'
    else if (k.orders > 0 && k.clicks < LUCK_CLICKS && k.orders / k.clicks > breakEven) verdict = 'luck'
    else {
      verdict = 'wait'
      // "About N more clicks": assume the keyword keeps its current pace.
      const mean = a / (a + b)
      for (let extra = 5; extra <= 300; extra += 5) {
        const held = betaCdf(breakEven, a + mean * extra, b + (1 - mean) * extra)
        if (held >= SURE || 1 - held >= SURE) {
          more = extra
          break
        }
      }
    }
    return { ...k, breakEven, every, verdict, more }
  })

  const order: Record<Verdict, number> = { stop: 0, luck: 1, wait: 2, keep: 3 }
  keywords.sort((x, y) => order[x.verdict] - order[y.verdict] || y.spend - x.spend)

  const counts: Record<Verdict, number> = { stop: 0, keep: 0, luck: 0, wait: 0 }
  for (const k of keywords) counts[k.verdict]++

  const stoppedSpend = keywords.filter((k) => k.verdict === 'stop').reduce((s, k) => s + k.spend, 0)
  const savePerMonth = (stoppedSpend * DAYS_PER_MONTH) / Math.max(1, days)

  return { keywords, counts, savePerMonth, average }
}
