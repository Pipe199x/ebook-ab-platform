// Tiny A/B statistics helpers for the plan's charts, mockups and interactive companion (no dependencies).
// Same formulas as PLAN.md §3.19: two-sided alpha, 50/50 split, normal approximations.
(function (root) {
  "use strict";

  // Standard normal CDF via the complementary error function (Numerical Recipes erfcc, fractional error < 1.2e-7).
  function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function normCdf(x) { return 0.5 * erfc(-x / Math.SQRT2); }

  // Inverse normal CDF (Acklam's rational approximation, relative error < 1.15e-9).
  function normInv(p) {
    if (p <= 0 || p >= 1) throw new RangeError("p must be in (0, 1)");
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const lo = 0.02425, hi = 1 - lo;
    let q, r, x;
    if (p < lo) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= hi) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    return x;
  }

  // Visitors needed per variant to detect a relative lift in a conversion rate (PLAN.md §3.19 formula).
  function nPerArm(p1, relLift, alpha = 0.05, power = 0.8) {
    const p2 = p1 * (1 + relLift);
    const pBar = (p1 + p2) / 2;
    const za = normInv(1 - alpha / 2), zb = normInv(power);
    const num = za * Math.sqrt(2 * pBar * (1 - pBar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return (num * num) / ((p2 - p1) * (p2 - p1));
  }

  // Months of traffic for both variants together, given monthly visitors and the share sent into the test.
  function monthsNeeded(visitorsPerMonth, p1, relLift, share = 1) {
    return (2 * nPerArm(p1, relLift)) / (visitorsPerMonth * share);
  }

  // Smallest relative lift detectable with n visitors per variant (bisection on nPerArm).
  function mdeRel(n, p1, alpha = 0.05, power = 0.8) {
    let lo = 1e-4, hi = Math.min(50, 1 / p1 - 1 - 1e-9);
    if (nPerArm(p1, hi, alpha, power) > n) return Infinity;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (nPerArm(p1, mid, alpha, power) > n) lo = mid; else hi = mid;
    }
    return hi;
  }

  // Two-proportion z-test: pooled test, unpooled 95% CI for the difference B - A.
  function zTest(xA, nA, xB, nB) {
    const pA = xA / nA, pB = xB / nB, diff = pB - pA;
    const pPool = (xA + xB) / (nA + nB);
    const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
    const se = Math.sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB);
    const z = diff / sePool;
    const zc = normInv(0.975);
    return { pA, pB, diff, ci: [diff - zc * se, diff + zc * se], z, p: 2 * (1 - normCdf(Math.abs(z))) };
  }

  // Sample-ratio mismatch for a planned 50/50 split (chi-square, 1 df).
  function srmP(nA, nB) {
    const chi2 = ((nA - nB) * (nA - nB)) / (nA + nB);
    return 2 * (1 - normCdf(Math.sqrt(chi2)));
  }

  // Normal-normal posterior on the log-odds ratio of B vs A; prior N(mu, tau^2) (tau = Infinity: flat).
  function posterior(xA, nA, xB, nB, mu = 0, tau = Infinity) {
    const a = xA + 0.5, b = nA - xA + 0.5, c = xB + 0.5, d = nB - xB + 0.5;
    const est = Math.log(c / d) - Math.log(a / b);
    const se2 = 1 / a + 1 / b + 1 / c + 1 / d;
    const precision = 1 / se2 + (isFinite(tau) ? 1 / (tau * tau) : 0);
    const mean = (est / se2 + (isFinite(tau) ? mu / (tau * tau) : 0)) / precision;
    const sd = Math.sqrt(1 / precision);
    const pBetter = normCdf(mean / sd);
    // Expected loss (in log-odds) of choosing B: E[max(0, -theta)].
    const phi = Math.exp(-0.5 * (mean / sd) ** 2) / Math.sqrt(2 * Math.PI);
    const lossB = sd * phi - mean * (1 - pBetter);
    return { est, se: Math.sqrt(se2), mean, sd, pBetter, lossB };
  }

  // Chance that a test with n per variant ends significant and positive, averaged over a prior on the true log-odds ratio.
  function assurance(n, p1, mu, tau, alpha = 0.05) {
    const se = Math.sqrt(2 / (n * p1 * (1 - p1)));
    const za = normInv(1 - alpha / 2);
    return normCdf((mu - za * se) / Math.sqrt(se * se + tau * tau));
  }

  const api = { normCdf, normInv, nPerArm, monthsNeeded, mdeRel, zTest, srmP, posterior, assurance };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ABStats = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
