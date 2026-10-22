/**
 * Real or luck? (§3.13, L4): an exact binomial test on two sales counts,
 * adjusted for the number of days. No dependencies, no request: it all runs
 * in the browser, so a writer's numbers never leave the device (D24).
 *
 * Under "the change did nothing", the after-count is Binomial(n, p) with
 * n = sales_before + sales_after and p = days_after / (days_before + days_after).
 * The days enter only through p, which is what "adjusted for the days" means.
 */

export interface Counts {
  sales: number
  days: number
}

export const ALPHA = 0.05

/** Lanczos ln Γ. Binomial coefficients need it once n gets past ~170. */
function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  const g = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  z -= 1
  let x = g[0]
  for (let i = 1; i < 9; i++) x += g[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function lnPmf(i: number, n: number, p: number): number {
  return (
    lnGamma(n + 1) - lnGamma(i + 1) - lnGamma(n - i + 1) + i * Math.log(p) + (n - i) * Math.log(1 - p)
  )
}

/** Two-sided exact binomial p-value: every outcome at least as unlikely as the one seen. */
export function binomTwoSided(k: number, n: number, p = 0.5): number {
  if (n === 0) return 1
  const obs = lnPmf(k, n, p)
  let sum = 0
  for (let i = 0; i <= n; i++) {
    const lp = lnPmf(i, n, p)
    if (lp <= obs + 1e-9) sum += Math.exp(lp)
  }
  return Math.min(1, sum)
}

/** p-value for "the after rate is the before rate". */
export function rateTest(before: Counts, after: Counts): number {
  const n = before.sales + after.sales
  if (n === 0) return 1
  const p = after.days / (before.days + after.days)
  return binomTwoSided(after.sales, n, p)
}

/**
 * Days of the same pace that would settle it: both rates held, more days added
 * to both sides, first day count whose p-value drops below ALPHA. Null when a
 * year of the same pace still is not enough (the honest "you would need a very
 * long time").
 */
export function daysToSettle(before: Counts, after: Counts, maxExtraDays = 365): number | null {
  const rb = before.sales / before.days
  const ra = after.sales / after.days
  for (let extra = 1; extra <= maxExtraDays; extra++) {
    const b = { sales: Math.round(rb * (before.days + extra)), days: before.days + extra }
    const a = { sales: Math.round(ra * (after.days + extra)), days: after.days + extra }
    if (rateTest(b, a) < ALPHA) return extra
  }
  return null
}
