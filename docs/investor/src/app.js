/* Before You Decide · investor demo
   No dependencies, no network. Every number on screen is computed here from the sample data,
   so an investor can edit an input and watch the verdict move.
   Stats: abstats.js (z-test, SRM, sample size) plus lgamma/betaCDF/binomP. */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  };
  var nf = function (n, d) { return Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var pct = function (x, d) { return (x * 100).toFixed(d == null ? 1 : d) + "%"; };

  var S = window.ABStats;

  /* ---------------- Outbound-data tripwire ----------------
     The Ad Doctor claims the file never leaves the browser. Rather than assert it, count every way
     a page can send data, so the claim can be shown and the click-through test can enforce it. */
  var networkTaps = [];
  var tap = function (what) { networkTaps.push(what); };
  try {
    var _fetch = window.fetch;
    if (_fetch) window.fetch = function () { tap("fetch"); return _fetch.apply(this, arguments); };
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () { tap("xhr"); return _open.apply(this, arguments); };
    var _beacon = navigator.sendBeacon;
    if (_beacon) navigator.sendBeacon = function () { tap("beacon"); return false; };
    if (window.WebSocket) {
      var _WS = window.WebSocket;
      window.WebSocket = function () { tap("websocket"); return new (Function.prototype.bind.apply(_WS, [null].concat([].slice.call(arguments))))(); };
    }
    if (window.EventSource) {
      var _ES = window.EventSource;
      window.EventSource = function () { tap("eventsource"); return new (Function.prototype.bind.apply(_ES, [null].concat([].slice.call(arguments))))(); };
    }
  } catch (e) { /* an older browser without these: nothing to wrap */ }

  /* ---------------- Special functions ---------------- */
  function lgamma(x) {
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
      1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1;
    var a = c[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(x, a, b) {
    var FPMIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 300; m++) {
      var m2 = 2 * m, aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function betaCDF(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? (bt * betacf(x, a, b)) / a : 1 - (bt * betacf(1 - x, b, a)) / b;
  }
  function binomP(k, n, p) {
    /* The loop is O(n), so it is capped: a demo field accepting a million "sales" must not hang. */
    if (!(n >= 0) || n > BINOM_MAX) return NaN;
    var lp = function (i) {
      return lgamma(n + 1) - lgamma(i + 1) - lgamma(n - i + 1) + i * Math.log(p) + (n - i) * Math.log(1 - p);
    };
    var d = lp(k), s = 0;
    for (var i = 0; i <= n; i++) { var li = lp(i); if (li <= d + 1e-7) s += Math.exp(li); }
    return Math.min(1, s);
  }
  var BINOM_MAX = 10000;
  /* "1 in N" language for a p-value.
     Floors 1/p to ONE significant figure so the phrase never understates the chance
     (a flat ladder said "1 time in 20" for p = 0.001, which is off by 50x). */
  function chance(p) {
    if (!(p > 0)) return "never, in this test";
    if (p < 0.001) return "less than 1 time in 1,000";
    if (p >= 0.9) return "almost every time";
    if (p >= 0.3) {
      var d = Math.round(p * 10);
      if (d === 10) return "almost every time";
      return (d === 5 ? "about 1 time in 2" : "about " + d + " times in 10");
    }
    var n = 1 / p;
    var mag = Math.pow(10, Math.floor(Math.log10(n)));
    var floored = Math.floor(n / mag) * mag;
    return "about 1 time in " + nf(floored) + " tests like this";
  }

  /* ---------------- CSV + Ad Doctor ---------------- */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, "");
    var rows = [], row = [], cell = "", q = false;
    var first = text.split(/\r?\n/)[0] || "";
    var delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
  }
  function money(s) {
    var raw = String(s).trim();
    var neg = /^\(.*\)$/.test(raw);        /* accounting negatives: (3.20) means -3.20 */
    var x = raw.replace(/[^\d.,-]/g, "");
    if (x.indexOf(",") >= 0 && x.indexOf(".") >= 0) {
      x = x.lastIndexOf(",") > x.lastIndexOf(".") ? x.replace(/\./g, "").replace(",", ".") : x.replace(/,/g, "");
    } else if (x.indexOf(",") >= 0) {
      x = /,\d{1,2}$/.test(x) ? x.replace(",", ".") : x.replace(/,/g, "");
    }
    var n = parseFloat(x);
    if (!isFinite(n)) return 0;
    return neg && n > 0 ? -n : n;
  }
  /* A report period must be a real number of days. Anything else falls back to 30 rather than
     clamping to 1, which would annualize the spend 30x. */
  function reportDays(v) {
    var n = Math.round(Number(v));
    return isFinite(n) && n >= 1 && n <= 366 ? n : 30;
  }

  function analyze(text, royalty, days) {
    days = reportDays(days);
    royalty = Number(royalty) > 0 ? Number(royalty) : 3.4;
    var rows = parseCSV(text);
    /* The header is the first of the first ten rows that matches at least two of the columns we
       need. Searching anywhere for "click" mistook a search term containing the word for the header. */
    var need = [["click", "clic"], ["spend", "gasto", "inversión", "inversion", "cost"],
      ["order", "pedido", "conversion", "compra"]];
    var hi = -1;
    for (var r = 0; r < Math.min(10, rows.length); r++) {
      var hits = need.filter(function (keys) {
        return rows[r].some(function (c) {
          var lc = c.trim().toLowerCase();
          return keys.some(function (k) { return lc.indexOf(k) >= 0; });
        });
      }).length;
      if (hits >= 2) { hi = r; break; }
    }
    if (hi < 0) return { error: "header" };
    var head = rows[hi].map(function (c) { return c.trim().toLowerCase(); });
    function find() {
      var keys = Array.prototype.slice.call(arguments);
      for (var i = 0; i < head.length; i++) {
        for (var k = 0; k < keys.length; k++) if (head[i].indexOf(keys[k]) >= 0) return i;
      }
      return -1;
    }
    var iTerm = find("customer search term", "término de búsqueda", "termino de busqueda", "search term", "targeting", "segmentación");
    var iClicks = find("clicks", "clics");
    var iSpend = find("spend", "gasto", "inversión", "inversion");
    var iOrders = find("total orders", "pedidos totales", "orders", "pedidos");
    if ([iTerm, iClicks, iSpend, iOrders].some(function (i) { return i < 0; })) return { error: "columns" };

    var byTerm = {};
    for (var ri = hi + 1; ri < rows.length; ri++) {
      var row = rows[ri], term = (row[iTerm] || "").trim();
      if (!term) continue;
      var k = byTerm[term] || (byTerm[term] = { term: term, clicks: 0, spend: 0, orders: 0 });
      var clicks = Math.max(0, money(row[iClicks]));
      k.clicks += clicks;
      k.spend += Math.max(0, money(row[iSpend]));
      /* Orders can never exceed clicks; a bad row would otherwise push the posterior negative. */
      k.orders += Math.min(clicks, Math.max(0, money(row[iOrders])));
    }
    var kws = Object.keys(byTerm).map(function (t) { return byTerm[t]; }).filter(function (k) { return k.clicks > 0; });
    if (!kws.length) return { error: "empty" };

    var C = 0, O = 0, SP = 0;
    kws.forEach(function (k) { C += k.clicks; O += k.orders; SP += k.spend; });
    /* The book's own rate is the prior, but Laplace-smoothed and never driven to the floor by a
       book with no orders yet: at p0 = .005 with K = 20 pseudo-clicks, a 0-order book makes every
       keyword with >= 10 clicks a "Stop", which is the prior talking, not the keyword. */
    var calibrated = O >= 30;
    var p0 = calibrated ? Math.min(0.9, Math.max(0.01, (O + 0.5) / (C + 1))) : 0.08;
    var K = 20, a0 = p0 * K, b0 = (1 - p0) * K, cpc0 = C ? SP / C : 0.4, SURE = 0.9;

    kws.forEach(function (k) {
      var cpc = k.clicks ? k.spend / k.clicks : cpc0;
      var be = Math.min(0.99, cpc / Math.max(0.01, royalty));
      var a = a0 + k.orders, b = b0 + k.clicks - k.orders;
      var below = betaCDF(be, a, b);
      k.be = be;
      k.every = Math.max(1, Math.round(1 / be));
      k.pBelow = below;
      /* A Stop is arithmetically impossible below the point where the prior alone reaches 90%,
         so each keyword carries its own floor. 10 stays as a hard minimum for small evidence. */
      k.floor = minClicksFor(be, a0, b0);
      k.more = null;
      if (k.clicks >= k.floor && below >= SURE) k.verdict = "stop";
      else if (k.clicks >= k.floor && 1 - below >= SURE) k.verdict = "keep";
      else if (k.orders > 0 && 1 - below >= 0.4 && k.orders / k.clicks > be && k.clicks < k.floor) k.verdict = "luck";
      else {
        k.verdict = "wait";
        var mean = a / (a + b);
        for (var extra = 5; extra <= 300; extra += 5) {
          var pb = betaCDF(be, a + mean * extra, b + (1 - mean) * extra);
          if (pb >= SURE || 1 - pb >= SURE) { k.more = extra; break; }
        }
      }
    });

    var order = { stop: 0, luck: 1, wait: 2, keep: 3 };
    kws.sort(function (x, y) { return order[x.verdict] - order[y.verdict] || y.spend - x.spend; });
    var counts = { stop: 0, keep: 0, luck: 0, wait: 0 };
    var gross = 0, stopOrders = 0;
    kws.forEach(function (k) {
      counts[k.verdict]++;
      if (k.verdict === "stop") { gross += k.spend; stopOrders += k.orders; }
    });
    var perMonth = 30 / Math.max(1, days);
    /* Gross spend you stop paying, and the net of the sales those keywords were credited with. */
    return {
      kws: kws, counts: counts, p0: p0, calibrated: calibrated,
      save: gross * perMonth,
      net: (gross - stopOrders * royalty) * perMonth,
      nStop: counts.stop
    };
  }

  /* Fewest clicks at which the prior plus zero orders can reach 90% below break-even. */
  function minClicksFor(be, a0, b0) {
    for (var n = 5; n <= 60; n += 1) {
      if (betaCDF(be, a0, b0 + n) >= 0.9) return Math.max(10, n);
    }
    return 10;
  }

  /* An invented Amazon Ads search-term report, 30 days, a romance ebook at USD 3.40 a sale.
     The verdicts it produces come from the model, not from a target: 10 stop, 2 keep, 6 luck, 8 wait. */
  var SAMPLE_CSV = [
    "Campaign Name,Ad Group Name,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Orders (#),7 Day Total Sales",
    "Auto - Romance,Auto,romance novel,18200,140,$36.40,22,$109.78",
    "Auto - Romance,Auto,romance novels,11400,96,$24.96,14,$69.86",
    "Manual - Authors,Authors,colleen hoover,24100,62,$32.24,0,$0.00",
    "Manual - Authors,Authors,it ends with us,19800,58,$29.00,0,$0.00",
    "Manual - Authors,Authors,book tok romance,16200,51,$26.52,1,$4.99",
    "Manual - Broad,Broad,free romance books,14300,47,$23.50,0,$0.00",
    "Manual - Broad,Broad,romance audiobook,12600,41,$20.50,0,$0.00",
    "Manual - Broad,Broad,cheap thrillers,9800,36,$18.00,1,$4.99",
    "Manual - Broad,Broad,romantic suspense,9100,33,$15.84,0,$0.00",
    "Manual - Broad,Broad,second chance romance,8400,29,$13.92,1,$4.99",
    "Manual - Narrow,Narrow,holiday romance,1900,7,$3.22,2,$9.98",
    "Manual - Narrow,Narrow,beach read,1600,6,$3.00,3,$14.97",
    "Manual - Narrow,Narrow,billionaire romance,1400,5,$2.40,2,$9.98",
    "Manual - Narrow,Narrow,mystery novels,1200,4,$1.84,2,$9.98",
    "Manual - Narrow,Narrow,thriller books,1100,3,$1.44,2,$9.98",
    "Manual - Narrow,Narrow,book club picks,900,2,$0.92,2,$9.98",
    "Auto - Romance,Auto,contemporary romance,6400,22,$7.48,1,$4.99",
    "Auto - Romance,Auto,clean romance,5200,18,$5.76,0,$0.00",
    "Auto - Romance,Auto,enemies to lovers,4600,15,$4.80,1,$4.99",
    "Auto - Romance,Auto,historical romance,3900,12,$4.08,0,$0.00",
    "Auto - Romance,Auto,kindle unlimited romance,3400,10,$3.40,1,$4.99",
    "Auto - Romance,Auto,small town romance,3000,9,$3.06,0,$0.00",
    "Auto - Romance,Auto,cozy mystery box set,2400,6,$1.68,0,$0.00",
    "Auto - Romance,Auto,new adult romance,2000,5,$1.40,0,$0.00",
    "Auto - Romance,Auto,dark romance,1700,4,$1.12,0,$0.00",
    "Auto - Romance,Auto,sports romance,1300,3,$0.84,0,$0.00"
  ].join("\n");

  /* ---------------- Duel ---------------- */
  var TARGET = 330;  /* What gap is worth acting on. 15 points is the only margin 330 readers can actually
     settle at 80% power (~0.83); a 10-point margin would need 690 readers. */
  var MARGIN = 0.15;
  var duel = {
    step: "create",
    kind: "cover",
    genre: "Romance",
    lang: "Spanish",
    a: 72, b: 71,
    yesA: 40, yesB: 68     /* the demo's finished Duel: 24% vs 41% wanted the first page */
  };

  function duelVerdict(votes) {
    var nA = votes.nA, nB = votes.nB, n = nA + nB;
    var out = { nA: nA, nB: nB, n: n, margin: MARGIN };
    /* Impossible counts must be rejected before the test: yes can never exceed its own arm. */
    if (!(votes.yesA >= 0 && votes.yesA <= nA && votes.yesB >= 0 && votes.yesB <= nB)) {
      out.kind = "unfair"; out.srm = 1; return out;
    }
    /* SRM is not judged on a test too small for the chi-square to mean anything. */
    if (n < 10) return { kind: "early", srm: 1, n: n, margin: MARGIN };
    var srm = S.srmP(nA, nB);
    out.srm = srm;
    if (srm < 0.001) { out.kind = "unfair"; return out; }
    var z = S.zTest(votes.yesA, nA, votes.yesB, nB);
    out.z = z;
    /* A win needs BOTH the test and the interval to agree: the pooled test and the
       unpooled interval disagree in a thin band around alpha. */
    if (z.p < 0.05 && (z.ci[0] > 0 || z.ci[1] < 0)) { out.kind = "win"; out.arm = z.diff >= 0 ? "B" : "A"; return out; }
    /* Equivalence, not a point-estimate cutoff: "too close" only when the whole
       95% interval sits inside the margin. */
    if (z.ci[0] > -MARGIN && z.ci[1] < MARGIN) { out.kind = "close"; return out; }
    out.kind = "unsure";
    out.more = remainingReaders(votes.yesA, nA, votes.yesB, nB);
    return out;
  }

  /* Readers still needed, powered against a FIXED pre-specified gap (the margin), based on the
     lower arm's rate, counting each arm's own shortfall. Never the observed gap: that is the
     winner's-curse number, and it never reaches zero. */
  function remainingReaders(yesA, nA, yesB, nB) {
    var pLow = Math.min(yesA / nA, yesB / nB);
    pLow = Math.min(0.95, Math.max(0.02, pLow));
    var per = S.nPerArm(pLow, MARGIN / pLow);
    if (!isFinite(per)) return null;
    var needA = Math.max(0, Math.ceil(per) - nA), needB = Math.max(0, Math.ceil(per) - nB);
    var total = needA + needB;
    return total < 10 ? null : Math.round(total / 10) * 10;
  }

  /* ---------------- Real or luck? ---------------- */
  var luck = { bs: 9, bd: 7, as: 14, ad: 7 };
  function luckResult(l) {
    var d1 = Math.round(l.bd), d2 = Math.round(l.ad);
    var x1 = l.bs, x2 = l.as;
    /* Reject rather than coerce: a silently rounded 9.5 would be a different test. */
    if (![x1, x2, d1, d2].every(function (v) { return typeof v === "number" && isFinite(v); })) return { kind: "bad" };
    if (x1 < 0 || x2 < 0 || l.bd < 1 || l.ad < 1) return { kind: "bad" };
    if (x1 !== Math.round(x1) || x2 !== Math.round(x2) || l.bd !== d1 || l.ad !== d2) return { kind: "bad" };
    if (x1 + x2 === 0) return { kind: "zero" };
    if (x1 + x2 < 2) return { kind: "tooFew" };
    /* Exact equality by cross-multiplication, not by a float epsilon. */
    if (x1 * d2 === x2 * d1) return { kind: "same" };
    /* The exact test is O(n); refuse rather than freeze the tab. */
    if (x1 + x2 > BINOM_MAX) return { kind: "tooBig" };
    var p = d1 / (d1 + d2);
    var pv = binomP(x1, x1 + x2, p);
    var fragile = x1 + x2 < 10 || x1 === 0 || x2 === 0 || d1 < 3 || d2 < 3;
    var out = { pv: pv, fragile: fragile, x1: x1, x2: x2, d1: d1, d2: d2 };
    if (pv < 0.05) {
      out.kind = "real";
      out.dir = x2 / d2 > x1 / d1 ? "up" : "down";
      return out;
    }
    var before = -1, after = -1;
    for (var m = 2; m <= 26; m++) {
      if (binomP(Math.round(x1 * m), Math.round(x1 * m) + Math.round(x2 * m), p) < 0.05) {
        /* Only the EXTRA days count: the periods already ran. */
        before = Math.round(x1 * m) / 1 === 0 ? 0 : Math.max(0, Math.round(d1 * m) - d1);
        after = Math.max(0, Math.round(d2 * m) - d2);
        break;
      }
    }
    out.kind = "unsure";
    out.extraBefore = before;
    out.extraAfter = after;
    return out;
  }

  /* ---------------- Navigation ----------------
     Hash routes without slashes: the artifact viewer only admits a plain #token into location.hash. */
  var TOP = [
    ["duel", "Duel"], ["doctor", "Ad Doctor"], ["luck", "Real or luck?"],
    ["library", "Library"], ["nerds", "For nerds"]
  ];
  var ROUTES = ["home"].concat(TOP.map(function (r) { return r[0]; })).concat(["play", "store", "plan"]);

  function route() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0].split("=")[0];
    return ROUTES.indexOf(h) >= 0 ? h : "home";
  }

  function setNav() {
    var cur = route();
    $("#nav").innerHTML = TOP.map(function (r) {
      return '<a href="#' + r[0] + '"' + (cur === r[0] ? ' aria-current="page"' : "") + ">" + esc(r[1]) + "</a>";
    }).join("");
  }

  /* ---------------- Covers ---------------- */
  var UID = 0;
  function coverIllus(lines, label) {
    var id = "cv" + (++UID);
    var fs = lines.some(function (l) { return l.length > 13; }) ? 17 : 20;
    return '<svg viewBox="0 0 200 300" role="img" aria-label="' + esc(label) + '">' +
      '<defs><linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffdcb8"/><stop offset=".55" stop-color="#f4aaa2"/><stop offset="1" stop-color="#9ccbe0"/>' +
      '</linearGradient></defs><rect width="200" height="300" fill="url(#' + id + 's)"/>' +
      '<circle cx="152" cy="98" r="20" fill="#fff4dc"/>' +
      '<path d="M0 214 L60 196 L104 206 L104 300 L0 300 Z" fill="#7a9a6e"/>' +
      '<rect x="56" y="130" width="15" height="74" fill="#fbf7f0"/>' +
      '<rect x="56" y="148" width="15" height="9" fill="#c4473a"/><rect x="56" y="170" width="15" height="9" fill="#c4473a"/>' +
      '<path d="M52 130 h23 l-4 -12 h-15 z" fill="#c4473a"/><rect x="59" y="110" width="9" height="8" fill="#ffe8a3"/>' +
      '<path d="M68 114 L130 100 L130 128 Z" fill="#fff6c9" opacity=".55"/>' +
      '<path d="M0 226 q25 -9 50 0 t50 0 t50 0 t50 0 V300 H0 Z" fill="#4e8fb0"/>' +
      '<path d="M0 246 q25 -9 50 0 t50 0 t50 0 t50 0 V300 H0 Z" fill="#336f8f"/>' +
      lines.map(function (l, i) {
        return '<text x="100" y="' + (36 + i * (fs + 3)) + '" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-size="' + fs + '" font-style="italic" fill="#3d2a3f">' + esc(l) + "</text>";
      }).join("") +
      '<text x="100" y="284" text-anchor="middle" font-family="Poppins, sans-serif" font-size="9.5" letter-spacing="2.4" fill="#ffffff">MARINA SOLANO</text></svg>';
  }
  function coverDrama(lines, label) {
    var id = "cd" + (++UID);
    return '<svg viewBox="0 0 200 300" role="img" aria-label="' + esc(label) + '">' +
      '<defs><linearGradient id="' + id + 'n" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0d2633"/><stop offset=".55" stop-color="#1f5566"/><stop offset="1" stop-color="#e3814f"/>' +
      '</linearGradient><radialGradient id="' + id + 'g" cx=".5" cy=".72" r=".5">' +
      '<stop offset="0" stop-color="#ffc98b" stop-opacity=".9"/><stop offset="1" stop-color="#ffc98b" stop-opacity="0"/>' +
      '</radialGradient></defs><rect width="200" height="300" fill="url(#' + id + 'n)"/>' +
      '<rect width="200" height="300" fill="url(#' + id + 'g)"/>' +
      '<path d="M0 250 Q100 236 200 250 V300 H0 Z" fill="#0b1d26"/>' +
      '<circle cx="88" cy="186" r="10" fill="#0b1d26"/><path d="M74 252 Q76 204 88 199 Q100 204 102 252 Z" fill="#0b1d26"/>' +
      '<circle cx="113" cy="182" r="10.5" fill="#0b1d26"/><path d="M99 252 Q101 200 113 195 Q126 200 128 252 Z" fill="#0b1d26"/>' +
      lines.map(function (l, i) {
        return '<text x="100" y="' + (46 + i * 30) + '" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="600" font-size="' +
          (i === lines.length - 1 ? 27 : 19) + '" letter-spacing="1.2" fill="#ffffff">' + esc(l.toUpperCase()) + "</text>";
      }).join("") +
      '<text x="100" y="284" text-anchor="middle" font-family="Poppins, sans-serif" font-size="9.5" letter-spacing="3" fill="#f6d6b8">MARINA SOLANO</text></svg>';
  }
  var TITLE_A = ["What the Sea", "Didn't Say"];
  var TITLE_B = ["What the Sea", "DIDN'T SAY"];

  /* ---------------- Home ---------------- */
  function buildHome() {
    $("#cover-a").innerHTML = coverIllus(TITLE_A, "Version A cover");
    $("#cover-b").innerHTML = coverDrama(TITLE_B, "Version B cover");
    $("#cover-b2").innerHTML = coverDrama(TITLE_B, "Version B cover");
    $("#cover-game").innerHTML = coverDrama(["THE RAVENS'", "INHERITANCE"], "Fantasy cover");
    var road = [
      ["Built", "The plan, the prototype, and the statistics library", "plan v3.0"],
      ["Built", "The $0 stack, verified against each free plan", "$0 / month"],
      ["Not started", "Public site, Duel service, Real or luck?", "Phase 0–1 · 36–52 h"],
      ["Not started", "Simulated store, lakehouse, Real lessons", "Phase 2–6 · 65–86 h"],
      ["Not started", "Ad Doctor, game, library, more pages", "Phase 7 · 50–70 h"],
      ["Not started", "Daily run without a laptop; docs and report", "Phase 8–10 · 30–39 h"]
    ];
    $("#road").innerHTML = road.map(function (r) {
      var cls = r[0] === "Built" ? "built" : "proto";
      return '<div class="road-row"><span class="st ' + cls + '">' + esc(r[0]) + "</span><span>" + esc(r[1]) + "</span><span class=\"mono small\">" + esc(r[2]) + "</span></div>";
    }).join("");
    var teaser = $("#nerds-teaser");
    if (teaser) buildTeaser(teaser);
  }

  function buildTeaser(el) {
    /* A small, static echo of the three lanes: no interaction, no motion. */
    var w = 800, h = 500;
    var lanes = [
      { y: 120, c: "#4d7fc4", label: "Real people", boxes: ["Duel link", "Votes (D1)", "One file a day", "Library"] },
      { y: 250, c: "#9b7fd6", label: "Real public tests", boxes: ["Upworthy", "4,873 tests", "Real lessons"] },
      { y: 380, c: "#e8b45a", label: "Simulated", boxes: ["70,000 shoppers", "Kafka", "Lakehouse", "Test store"] }
    ];
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Three data lanes that never cross" style="width:100%;height:100%">';
    lanes.forEach(function (l) {
      s += '<text x="24" y="' + (l.y - 34) + '" font-family="Poppins, sans-serif" font-size="13" font-weight="600" fill="' + l.c + '">' + esc(l.label.toUpperCase()) + "</text>";
      s += '<path d="M24 ' + l.y + ' H' + (w - 24) + '" stroke="' + l.c + '" stroke-opacity=".35" stroke-width="2" stroke-dasharray="5 6"/>';
      l.boxes.forEach(function (b, i) {
        var x = 40 + i * ((w - 80) / l.boxes.length), bw = (w - 80) / l.boxes.length - 18;
        s += '<rect x="' + x + '" y="' + (l.y - 20) + '" width="' + bw + '" height="40" rx="10" fill="#fff" stroke="' + l.c + '" stroke-opacity=".45"/>' +
          '<text x="' + (x + bw / 2) + '" y="' + (l.y + 5) + '" text-anchor="middle" font-family="Poppins, sans-serif" font-size="12" fill="#141f47">' + esc(b) + "</text>";
      });
    });
    s += "</svg>";
    el.innerHTML = s;
  }

  /* ---------------- Duel view ---------------- */
  function viewDuel() {
    var host = $("#app");
    var steps = ["Create", "Share", "Readers vote", "Result"];
    var on = { create: 0, share: 1, vote: 2, result: 3 }[duel.step] || 0;
    var body = "";

    if (duel.step === "create") {
      body =
        '<div class="grid2">' +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">1 · What are you choosing?</span></div>' +
            '<div style="display:grid;gap:12px">' +
              '<label class="field">Kind' +
                '<select class="field" id="d-kind">' + ["Cover", "Title", "Blurb", "Book idea"].map(function (k) {
                  return '<option' + (duel.kind === k.toLowerCase().replace(" ", "") ? " selected" : "") + ">" + k + "</option>";
                }).join("") + "</select></label>" +
              '<div class="pair2">' +
                '<label class="field">Genre<select class="field" id="d-genre">' + ["Romance", "Fantasy", "Thriller", "Self-help", "Kids"].map(function (g) {
                  return '<option' + (duel.genre === g ? " selected" : "") + ">" + g + "</option>";
                }).join("") + "</select></label>" +
                '<label class="field">Book language<select class="field" id="d-lang">' + ["Spanish", "English"].map(function (g) {
                  return '<option' + (duel.lang === g ? " selected" : "") + ">" + g + "</option>";
                }).join("") + "</select></label>" +
              "</div>" +
              '<label class="field">What you earn per sale (USD)<input class="field num" value="3.40" readonly></label>' +
              '<p class="small">Covers are shrunk in the browser to about 60 KB before upload, and deleted 30 days after the Duel ends.</p>' +
              '<button class="btn wide" onclick="BYD.duelGo(\'share\')">Create the Duel <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
            "</div>" +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">The two versions</span><span class="chip">Example</span></div>' +
            '<div class="pair-stage" style="border:0;background:none;box-shadow:none;padding:0">' +
              '<div class="arm a"><span class="tag">Version A</span><span class="cover">' + coverIllus(TITLE_A, "Version A") + "</span></div>" +
              '<span class="vs">VS</span>' +
              '<div class="arm b"><span class="tag">Version B</span><span class="cover">' + coverDrama(TITLE_B, "Version B") + "</span></div>" +
            "</div>" +
            '<p class="src sim">Simulated · example covers drawn in code</p>' +
          "</div>" +
        "</div>";
    } else if (duel.step === "share") {
      body =
        '<div class="grid2">' +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">2 · One unlisted link</span><span class="chip"><i></i>Ready</span></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<code class="mono" style="flex:1;min-width:220px;padding:12px 14px;border-radius:12px;background:rgba(244,246,251,.06);border:1px solid var(--line-dark);font-size:13px">pipe199x.github.io/ebook-ab-platform/d/7KQ2</code>' +
              '<button class="btn sm" onclick="BYD.copy(this)">Copy</button>' +
            "</div>" +
            '<p style="margin-top:18px">Post it to <strong>Instagram</strong>, <strong>WhatsApp</strong>, <strong>Wattpad</strong>, <strong>TikTok</strong> or your newsletter.</p>' +
            '<div class="verdict"><h4>The result opens at 330 readers.</h4><p>That is enough to see a clear difference. The link is unlisted: only the people you share it with can vote.</p></div>' +
            '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' +
              '<button class="btn" onclick="BYD.duelGo(\'vote\')">See what a reader sees</button>' +
              '<button class="btn ghost" onclick="BYD.duelGo(\'result\')">Jump to the result (demo)</button>' +
            "</div>" +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">What readers see</span></div>' +
            '<div class="arm b" style="justify-items:center"><span class="cover" style="width:150px">' + coverDrama(TITLE_B, "Version B") + "</span></div>" +
            '<p class="serif" style="font-size:21px;text-align:center;margin-top:16px">Would you read the first page?</p>' +
            '<div style="display:grid;gap:10px;margin-top:14px"><span class="btn wide">Yes, I’d read it</span><span class="btn ghost wide">Not for me</span></div>' +
          "</div>" +
        "</div>";
    } else if (duel.step === "vote") {
      var n = Math.min(duel.a + duel.b, TARGET);
      var share = Math.round(n / TARGET * 100);
      body =
        '<div class="grid2">' +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">3 · A reader’s screen</span><span class="chip">One version, at random</span></div>' +
            '<div class="arm b" style="justify-items:center"><span class="cover" style="width:170px">' + coverDrama(TITLE_B, "Version B") + "</span></div>" +
            '<p class="serif" style="font-size:22px;text-align:center;margin-top:18px">Would you read the first page?</p>' +
            '<div style="display:grid;gap:10px;margin-top:16px">' +
              '<button class="btn wide" onclick="BYD.vote(\'yes\')">Yes, I’d read it</button>' +
              '<button class="btn ghost wide" onclick="BYD.vote(\'no\')">Not for me</button>' +
            "</div>" +
            '<p class="note">Anonymous, one tap, no account. The writer’s own device is never counted.</p>' +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">Writer’s progress</span><span class="chip">' + (n >= 10 ? "Live" : "Waiting") + "</span></div>" +
            '<h3 id="d-count">' + n + " of " + TARGET + " readers</h3>" +
            '<div class="bars"><div class="barrow"><span></span><span class="track"><i class="b" style="width:' + share + '%"></i></span><span class="val">' + share + "%</span></div></div>" +
            '<p style="margin-top:16px">The winner stays hidden until the target. Stopping early on a lucky streak is how people pick the wrong cover.</p>' +
            '<p class="small" style="margin-top:12px">Fair-split check: A ' + duel.a + " · B " + duel.b + " — looks fair.</p>" +
            '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' +
              '<button class="btn" onclick="BYD.duelGo(\'result\')">End the test (demo)</button>' +
              '<button class="btn ghost" onclick="BYD.duelGo(\'share\')">Back to the link</button>' +
            "</div>" +
          "</div>" +
        "</div>";
    } else {
      /* The finished Duel. duelGo('result') fills both arms to the target first, so these are the
         counts the test actually ran on; the yes counts are clamped into their own arm. */
      var nArm = Math.min(TARGET / 2, Math.max(duel.a, duel.b));
      var votes = {
        nA: nArm, nB: nArm,
        yesA: Math.min(duel.yesA, nArm), yesB: Math.min(duel.yesB, nArm)
      };
      var v = duelVerdict(votes);
      var pct1 = Math.round(MARGIN * 100);
      var head, sub, cls = "";
      if (v.kind === "win") {
        head = "Readers chose version " + v.arm + ".";
        sub = "If readers liked both versions equally, a gap at least this big would appear " + chance(v.z.p) + ".";
      } else if (v.kind === "close") {
        head = "Too close to call.";
        sub = "The difference is smaller than " + pct1 + " points — the size this test can actually settle. Pick the one you love and stop worrying.";
        cls = " close";
      } else if (v.kind === "unfair") {
        head = "Not fair yet.";
        sub = "The split was not the one you planned (A " + v.nA + ", B " + v.nB + "). The results are not trustworthy — check the link and the assignment, then rerun.";
        cls = " bad";
      } else if (v.kind === "early") {
        head = "Too early to check the split.";
        sub = "A few readers in, nothing can be judged yet.";
        cls = " close";
      } else {
        head = "Not sure yet.";
        sub = v.more
          ? "About " + v.more + " more readers would settle a difference this size, if the current rates hold."
          : "The difference is smaller than this test can settle, and reaching that size would take a very long run.";
        cls = " close";
      }
      var showBars = v.kind !== "unfair" && v.kind !== "early" && v.z;
      body =
        '<div class="grid2">' +
          '<div class="panel">' +
            '<span class="chip">Result · ' + (v.n || 0) + ' readers</span>' +
            '<div class="verdict' + cls + '" style="margin-top:16px"><h4 style="font-size:clamp(24px,3vw,34px)">' + esc(head) + "</h4><p>" + esc(sub) + "</p></div>" +
            (showBars
              ? '<p style="margin-top:20px" class="small">Wanted to read the first page</p>' +
                '<div class="bars">' +
                  '<div class="barrow"><span>A</span><span class="track"><i class="a" style="width:' + (v.z.pA * 100) + '%"></i></span><span class="val">' + pct(v.z.pA) + "</span></div>" +
                  '<div class="barrow"><span>B</span><span class="track"><i class="b" style="width:' + (v.z.pB * 100) + '%"></i></span><span class="val">' + pct(v.z.pB) + "</span></div>" +
                "</div>" +
                '<p class="note">For the curious: difference ' + (v.z.diff >= 0 ? "+" : "") + (v.z.diff * 100).toFixed(1) +
                " points (95% range " + (v.z.ci[0] * 100).toFixed(1) + " to " + (v.z.ci[1] * 100).toFixed(1) +
                "); split check p = " + v.srm.toFixed(2) + ". A normal-approximation test, not an exact one.</p>"
              : "") +
            '<p class="note"><strong>This measured interest in the first page, not sales.</strong> It is not a review rate, a conversion rate or revenue.</p>' +
            '<p class="src sim">Simulated · example Duel votes</p>' +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">What this does not prove</span></div>' +
            '<p>A Duel measures whether readers want the first page. It does not measure sales, and it is not advice to change the book.</p>' +
            '<p style="margin-top:12px">With the writer’s OK, this result joins the library anonymously — genre, language, what changed and the outcome. No images, no names.</p>' +
            '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' +
              '<button class="btn" onclick="BYD.duelGo(\'create\')">Start another Duel</button>' +
              '<a class="btn ghost" href="#library">See the library</a>' +
            "</div>" +
          "</div>" +
        "</div>";
    }

    host.innerHTML =
      '<section class="view band dark" style="background:var(--navy-b)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">The Duel</p><h1>Two versions. One honest result.</h1>' +
        '<p class="lead">Create it in 30 seconds, share one link, and let readers decide. You see progress, never the winner, until the test ends.</p></div>' +
        '<div class="steps">' + steps.map(function (s, i) { return "<span" + (i === on ? ' class="on"' : "") + ">" + (i + 1) + " " + esc(s) + "</span>"; }).join("") + "</div>" +
        body +
      "</div></section>";
  }

  /* ---------------- Play ---------------- */
  var playCards = [
    { genre: "Fantasy", title: ["THE RAVENS'", "INHERITANCE"], drama: true },
    { genre: "Romance", title: ["A SUMMER", "IN LISBON"], drama: false },
    { genre: "Thriller", title: ["THE QUIET", "NEIGHBOR"], drama: true }
  ];
  var playIdx = 0, playVotes = 0;

  function viewPlay() {
    var c = playCards[playIdx % playCards.length];
    var cover = c.drama ? coverDrama(c.title, c.genre + " cover") : coverIllus([c.title[0], c.title[1].toLowerCase()], c.genre + " cover");
    $("#app").innerHTML =
      '<section class="view band light" style="background:var(--mist)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">The game</p><h1>Which would you read?</h1>' +
        '<p class="lead">One cover from another writer’s Duel, at random. Every vote you give earns one vote for your own.</p></div>' +
        '<div class="grid2">' +
          '<div class="panel" style="text-align:center">' +
            '<span class="chip">' + esc(c.genre) + " · " + ((playIdx % playCards.length) + 1) + "/" + playCards.length + "</span>" +
            '<div style="width:190px;margin:18px auto 0">' + cover + "</div>" +
            '<p class="serif" style="font-size:22px;margin-top:18px">Would you read the first page?</p>' +
            '<div style="display:grid;gap:10px;margin-top:16px">' +
              '<button class="btn wide" onclick="BYD.playVote()">Yes, I’d read it</button>' +
              '<button class="btn ghost wide" onclick="BYD.playVote()">Not for me</button>' +
            "</div>" +
            '<p class="note">At first, a person checks every Duel before it enters the game.</p>' +
          "</div>" +
          '<div>' +
            '<div class="zero two" style="margin:0 0 20px">' +
              '<div style="border-color:var(--line-light);background:#fff"><b>' + playVotes + "</b><span>votes you gave</span></div>" +
              '<div style="border-color:var(--line-light);background:#fff"><b>' + playVotes + "</b><span>votes earned</span></div>" +
            "</div>" +
            '<div class="panel">' +
              '<div class="panel-head"><span class="t">Why this exists</span></div>' +
              '<p>A Duel only works if readers show up. The game is the supply of readers: writers vote on each other’s covers and earn the same number of votes for their own test.</p>' +
              '<p style="margin-top:12px">The credit lives on your Duel’s private link, so no accounts are needed.</p>' +
              '<p class="src sim">Simulated · example covers in this demo</p>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div></section>";
  }

  /* ---------------- Ad Doctor ---------------- */
  var doc = { csv: null, file: "", royalty: 3.4, days: 30, filter: "all", result: null };

  function viewDoctor() {
    if (!doc.result) runDoctor();
    var r = doc.result;
    var ERRS = {
      header: "We couldn’t find the header row. Is this a search-term report from Amazon Ads?",
      columns: "We couldn’t find the Clicks, Spend and Orders columns. Is this a search-term report from Amazon Ads?",
      empty: "That file has no keywords with clicks."
    };
    var tiles = r ? ["stop", "keep", "luck", "wait"].map(function (k) {
      return '<button class="tile" onclick="BYD.docFilter(\'' + k + '\')" aria-pressed="' + (doc.filter === k) + '">' +
        "<b>" + nf(r.counts[k]) + '</b><span class="pill ' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + "</span></button>";
    }).join("") : "";
    var list = r ? r.kws.filter(function (k) { return doc.filter === "all" || k.verdict === doc.filter; }).map(function (k) {
      var why;
      if (k.verdict === "stop") why = "Needs 1 sale every " + k.every + " clicks to break even. Clearly below that (" + Math.min(99, Math.round(k.pBelow * 100)) + "%+ likely losing).";
      else if (k.verdict === "keep") why = "Clearly above your break-even of 1 sale every " + k.every + " clicks (" + Math.min(99, Math.round((1 - k.pBelow) * 100)) + "%+ likely making money).";
      else if (k.verdict === "luck") why = k.orders + " sale" + (k.orders === 1 ? "" : "s") + " from only " + k.clicks + " clicks is ahead, but too few clicks to trust. Its own floor is " + k.floor + ".";
      else if (k.more) why = "About " + k.more + " more clicks would likely settle it.";
      else why = "Underpowered and close to break-even: a verdict would take a very long run. Pause it if money is tight.";
      return '<div class="kw"><span class="term">' + esc(k.term) + '</span><span class="pill ' + k.verdict + '">' + k.verdict.charAt(0).toUpperCase() + k.verdict.slice(1) + "</span>" +
        '<span class="why">' + k.clicks + " clicks · " + k.orders + " sales · USD " + k.spend.toFixed(2) + " spent. " + esc(why) + "</span></div>";
    }).join("") : "";

    $("#app").innerHTML =
      '<section class="view band dark" style="background:var(--navy-b)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">Ad Doctor</p><h1>What can you stop paying for?</h1>' +
        '<p class="lead">Drop your Amazon Ads search-term report. Every keyword gets a plain verdict. The file never leaves your browser.</p></div>' +
        '<div class="grid2">' +
          '<div class="panel">' +
            '<div class="drop" id="drop"><span>Drop your CSV here, or <label>choose a file<input type="file" id="csv" accept=".csv,text/csv"></label></span></div>' +
            '<p class="small" style="margin-top:10px">' + (doc.file ? "Using your file: " + esc(doc.file) + "." : "Using the example report: 30 days, a romance ebook.") + "</p>" +
            '<div class="pair2" style="margin-top:16px">' +
              '<label class="field">Royalty per sale, net (USD)<input class="field num" id="royalty" value="' + doc.royalty + '"></label>' +
              '<label class="field">Days in the report<input class="field num" id="days" value="' + doc.days + '"></label>' +
            "</div>" +
            '<p class="small" style="margin-top:10px">A 70% royalty on a USD 4.99 ebook is about USD 3.40.</p>' +
            '<div class="saving"><span class="small">You can stop spending about</span>' +
              '<div class="big">USD ' + nf(Math.round(r ? r.save : 0)) + ' <span style="font-size:16px;font-family:var(--sans);letter-spacing:0">a month</span></div>' +
              '<p class="small" style="margin-top:6px">on ' + (r ? r.nStop : 0) + " keywords that really lose money" +
              (r && r.nStop ? ". Net of the sales they were credited with: about USD " + nf(Math.round(r.net)) + "." : ".") + "</p></div>" +
            '<div class="tiles">' + tiles + "</div>" +
            '<p class="note">Each keyword starts from your book’s own rate, worth about 20 clicks of evidence, then its own clicks and sales move it. “Stop” means 90% sure it loses money — and each keyword carries its own minimum clicks before that verdict is even possible.</p>' +
            (r && !r.calibrated ? '<p class="note"><strong>Small account:</strong> fewer than 30 orders in this report, so the comparison uses a neutral 8% starting rate instead of your book’s own.</p>' : "") +
            '<p class="note">Estimate, if the same spend and sales repeat for 30 days. Assumes you lose the sales credited to these keywords and nothing organic replaces them. Not adjusted for season, returns, attribution lag, read-through or Kindle Unlimited.</p>' +
            '<p class="src sim">Simulated · example report, not advice for your book</p>' +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">' + (doc.filter === "all" ? "All keywords" : doc.filter.charAt(0).toUpperCase() + doc.filter.slice(1)) + '</span>' +
              '<button class="btn ghost sm" onclick="BYD.docFilter(\'all\')">All</button></div>' +
            '<div class="kwlist">' + list + "</div>" +
            (doc.error ? '<p class="verdict bad" style="margin-top:14px"><strong>Could not read that file.</strong> ' + esc(ERRS[doc.error] || ERRS.header) + "</p>" : "") +
            '<p class="note">The file is read here and nowhere else. This page wraps every way a browser can send data and shows the count below.</p>' +
            '<p class="note" id="netcheck">Network check: 0 requests.</p>' +
          "</div>" +
        "</div>" +
      "</div></section>";
    wireDoctor();
    paintNetCheck();
  }

  /* A receipt for the "nothing leaves your browser" claim: count what the page actually requested. */
  function paintNetCheck() {
    var el = $("#netcheck");
    if (!el) return;
    var resources = [];
    try { resources = performance.getEntriesByType("resource") || []; } catch (e) { resources = []; }
    var outside = resources.filter(function (r) {
      return !/^(data:|blob:)/.test(r.name) && r.name.indexOf("file://") !== 0;
    });
    var cookies = "";
    try { cookies = document.cookie; } catch (e) { cookies = ""; }
    el.textContent = "Network check: " + outside.length + " requests, " +
      networkTaps.length + " blocked send attempts, " + (cookies ? "cookies present" : "0 cookies") + ".";
  }
  function runDoctor() {
    var r = analyze(doc.csv || SAMPLE_CSV, Number(doc.royalty) || 3.4, Number(doc.days) || 30);
    doc.error = !!r.error;
    doc.result = r.error ? null : r;
  }
  function wireDoctor() {
    var f = $("#csv");
    if (f) f.onchange = function () { loadFile(f.files[0]); };
    var drop = $("#drop");
    if (drop) {
      ["dragover", "dragenter"].forEach(function (e) {
        drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); });
      });
      ["dragleave", "drop"].forEach(function (e) {
        drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); });
      });
      drop.addEventListener("drop", function (ev) {
        if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) loadFile(ev.dataTransfer.files[0]);
      });
    }
    var ry = $("#royalty"), dd = $("#days");
    if (ry) ry.onchange = function () { doc.royalty = Number(ry.value) || 3.4; runDoctor(); render(); };
    if (dd) dd.onchange = function () { doc.days = reportDays(dd.value); runDoctor(); render(); };
  }
  function loadFile(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      doc.csv = String(fr.result);
      doc.file = file.name;
      doc.filter = "all";
      runDoctor();
      render();
    };
    fr.readAsText(file);
  }

  /* ---------------- Real or luck? ---------------- */
  function viewLuck() {
    var r = luckResult(luck);
    var out = "";
    if (r.kind === "bad") out = '<div class="verdict close"><h4>Whole numbers, please.</h4><p>Sales and days must be whole numbers of at least 0 sales and 1 day.</p></div>';
    else if (r.kind === "zero") out = '<div class="verdict close"><h4>No sales in either period yet.</h4><p>Add a few sales, or wait a few days.</p></div>';
    else if (r.kind === "tooFew") out = '<div class="verdict close"><h4>One sale tells us nothing yet.</h4><p>Wait for a few more before comparing.</p></div>';
    else if (r.kind === "tooBig") out = '<div class="verdict close"><h4>Too many sales to test here.</h4><p>The exact test in this demo runs up to ' + nf(BINOM_MAX) + ' sales.</p></div>';
    else if (r.kind === "same") out = '<div class="verdict close"><h4>Nothing changed: same pace before and after.</h4></div>';
    else if (r.kind === "real") {
      out = '<div class="verdict' + (r.dir === "down" ? " bad" : "") + '"><h4>The pace of sales really went ' + r.dir + ".</h4>" +
        "<p>If nothing had changed, a " + (r.dir === "up" ? "rise" : "drop") + " at least this big would happen " + chance(r.pv) + ". That still does not tell you why.</p>" +
        (r.fragile ? "<p>Only " + (r.x1 + r.x2) + " sales so far: a strong hint, not a verdict.</p>" : "") + "</div>";
    } else {
      out = '<div class="verdict close"><h4>You can’t tell yet.</h4>' +
        "<p>If nothing had changed, a swing at least this big would happen " + chance(r.pv) + ".</p>" +
        (r.extraBefore >= 0 ? "<p>At this pace, about " + r.extraBefore + " more days before and " + r.extraAfter +
          " more after would settle it — if nothing else changes.</p>" : "") +
        (r.fragile ? "<p>Only " + (r.x1 + r.x2) + " sales so far: a hint, not a verdict.</p>" : "") + "</div>";
    }

    var mx = Math.max(luck.bs / Math.max(1, luck.bd), luck.as / Math.max(1, luck.ad), 0.001);
    $("#app").innerHTML =
      '<section class="view band light" style="background:var(--mist)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">Real or luck?</p><h1>Did my change do anything?</h1>' +
        '<p class="lead">Two sales numbers and two day counts. An exact test says whether the jump is real, or ordinary luck.</p></div>' +
        '<div class="grid2">' +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">Before the change</span><span class="t">After the change</span></div>' +
            '<div class="pair2">' +
              '<label class="field">Sales<input class="field num" id="bs" value="' + luck.bs + '"></label>' +
              '<label class="field">Sales<input class="field num" id="as2" value="' + luck.as + '"></label>' +
            "</div>" +
            '<div class="pair2" style="margin-top:12px">' +
              '<label class="field">Days<input class="field num" id="bd" value="' + luck.bd + '"></label>' +
              '<label class="field">Days<input class="field num" id="ad" value="' + luck.ad + '"></label>' +
            "</div>" +
            '<div class="bars" style="margin-top:20px">' +
              '<div class="barrow"><span>Before</span><span class="track"><i class="a" style="width:' + (luck.bs / Math.max(1, luck.bd) / mx * 100) + '%"></i></span><span class="val">' + ((luck.bs / Math.max(1, luck.bd))).toFixed(1) + "/d</span></div>" +
              '<div class="barrow"><span>After</span><span class="track"><i class="b" style="width:' + (luck.as / Math.max(1, luck.ad) / mx * 100) + '%"></i></span><span class="val">' + ((luck.as / Math.max(1, luck.ad))).toFixed(1) + "/d</span></div>" +
            "</div>" +
            out +
            '<p class="note">Also check: a holiday, a promotion, a new review, a price change or a change in your book’s rank can move sales too. Sales also arrive in runs, so the true uncertainty is a little wider than this test assumes.</p>' +
            '<p class="note">Each time you re-run this on the same numbers, chance alone will look real about 1 time in 20. Check once, with fresh days.</p>' +
          "</div>" +
          '<div class="panel">' +
            '<div class="panel-head"><span class="t">What this can and cannot say</span></div>' +
            '<p>The test asks one question: <em>if nothing had changed, how often would a swing this big happen?</em> It compares two rates and adjusts for how many days each one covers.</p>' +
            '<p style="margin-top:12px">It will not tell you why sales moved, and a p-value is not the chance that luck caused it. For a sure answer about a cover or a title, run a Duel.</p>' +
            '<p style="margin-top:16px"><a class="btn ghost" href="#duel">Start a Duel</a></p>' +
            '<p class="src public">Real public tests · same exact-binomial method used on 4,873 headline tests</p>' +
          "</div>" +
        "</div>" +
      "</div></section>";
    ["bs", "as2", "bd", "ad"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.onchange = function () { BYD.luckSet(id, el.value); };
    });
  }

  /* ---------------- Library ---------------- */
  function viewLibrary() {
    $("#app").innerHTML =
      '<section class="view band paper"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">Library &amp; Real lessons</p><h1>What worked for writers like you.</h1>' +
        '<p class="lead">Pooled from Duels and from ad tests writers already ran — and from 4,873 real headline tests, for realistic expectations.</p></div>' +
        '<div class="grid2">' +
          '<div class="panel evidence">' +
            '<div class="ev-top"><h3>Covers · romance · Spanish</h3><span class="chip">Shared by writers</span></div>' +
            '<p class="small">26 shared tests · worked clearly in 8 · made it worse in 1</p>' +
            '<p><strong>Typical change: +9% clicks</strong>, most between −2% and +21%.</p>' +
            '<div class="dots" aria-hidden="true"><div class="axis"></div><div class="zero" style="left:34%"></div>' +
              '<span class="dot win" style="left:22%"></span><span class="dot win" style="left:38%"></span><span class="dot" style="left:41%"></span>' +
              '<span class="dot" style="left:45%"></span><span class="dot win" style="left:52%"></span><span class="dot" style="left:55%"></span>' +
              '<span class="dot loss" style="left:58%"></span><span class="dot" style="left:62%"></span><span class="dot win" style="left:68%"></span>' +
              '<span class="dot" style="left:71%"></span><span class="dot win" style="left:76%"></span><span class="dot win" style="left:83%"></span>' +
              '<span class="tick" style="left:22%">−20%</span><span class="tick" style="left:34%">0</span><span class="tick" style="left:60%">+20%</span><span class="tick" style="left:88%">+40%</span></div>' +
            '<p class="legend"><span><i class="win"></i>worked</span><span><i></i>unclear</span><span><i class="loss"></i>made it worse</span><span>each dot = one shared test</span></p>' +
            '<p class="note">“Worked” means more readers wanted the first page, in a fair test. Not sales.</p>' +
            '<p class="src writers">Shared by writers · example numbers in this demo</p>' +
          "</div>" +
          '<div style="display:grid;gap:16px">' +
            '<div class="panel gate"><div class="ev-top"><h3 style="font-size:18px">Thrillers · English · titles</h3><span class="pill wait">3 of 5</span></div>' +
              '<div class="meter" aria-hidden="true"><span class="on"></span><span class="on"></span><span class="on"></span><span></span><span></span></div>' +
              '<p class="small">Not enough results yet. Numbers appear at 5 — be one of the first.</p><p class="src writers">Shared by writers</p></div>' +
            '<div class="panel"><div class="panel-head"><span class="t">How often each idea worked</span></div>' +
              '<p>Covers with a face · won <strong>6 of 9</strong> Duels</p><p style="margin-top:8px">Photo instead of an illustration · won <strong>2 of 5</strong></p>' +
              '<p class="note">Ideas with fewer than five results are counted but never shown.</p></div>' +
          "</div>" +
        "</div>" +
        '<h2 style="margin-top:clamp(40px,7vh,72px);font-size:clamp(26px,3.2vw,40px)">Three lessons from 4,873 real tests</h2>' +
        '<p class="lead" style="max-width:44em;margin-top:14px">Most changes make only a small difference. Test bold ideas, run the test to the planned end, and expect a bit less later.</p>' +
        '<div class="lessons" style="margin-top:28px">' +
          '<article class="lesson"><h4>Most changes are small</h4><div class="mini"><i style="height:18%"></i><i style="height:26%"></i><i style="height:14%"></i><i class="hi" style="height:74%"></i><i style="height:22%"></i><i style="height:31%"></i><i style="height:16%"></i></div><p>Test a bold change, not a tiny tweak. A small difference needs years of traffic.</p><p class="src public">Real public tests</p></article>' +
          '<article class="lesson"><h4>Clear winners are rare</h4><div class="mini"><i style="height:22%"></i><i style="height:18%"></i><i style="height:30%"></i><i style="height:24%"></i><i class="hi" style="height:60%"></i><i style="height:20%"></i><i style="height:28%"></i></div><p>“No clear winner” is a normal result, not a failure. It is what most honest tests find.</p><p class="src public">Real public tests</p></article>' +
          '<article class="lesson"><h4>Winners shrink when retested</h4><div class="mini"><i class="hi" style="height:82%"></i><i style="height:52%"></i><i style="height:44%"></i></div><p>Don’t stop early, and expect less later. The first big win is partly luck by construction.</p><p class="src public">Real public tests</p></article>' +
        "</div>" +
        '<p class="note">These are news-headline click tests, not ebook purchases. They set realistic expectations; they are never mixed into your group’s numbers.</p>' +
      "</div></section>";
  }

  /* ---------------- Store ---------------- */
  function viewStore() {
    $("#app").innerHTML =
      '<section class="view band dark" style="background:var(--navy-b)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">Behind the scenes</p><h1>The test store.</h1>' +
        '<p class="lead">A fictional marketplace we built to prove the math: 70,000 simulated shoppers, 92 days, three planted experiments with known answers.</p></div>' +
        '<div class="zero four">' +
          '<div><b>70k</b><span>shoppers</span></div><div><b>92</b><span>days</span></div>' +
          '<div><b>1.8M</b><span>events</span></div><div><b>20</b><span>Gold views</span></div>' +
        "</div>" +
        '<div class="grid2" style="margin-top:24px">' +
          '<div class="panel"><div class="panel-head"><span class="t">The three experiments</span><span class="pill wait">Simulated</span></div>' +
            '<div class="kwlist" style="max-height:none;overflow:visible">' +
              '<div class="kw"><span class="term">EXP-CHK-001 · wallet-first checkout</span><span class="pill keep">Keep</span><span class="why">Baseline 70%, +3.0 pp minimum effect, 3,554 per arm. More shoppers paid within 30 minutes; safety limits held.</span></div>' +
              '<div class="kw"><span class="term">EXP-PDP-002 · new cover + subtitle</span><span class="pill stop">Don’t keep</span><span class="why">Baseline 4.0%, +0.6 pp. Buyers rose, but refunds passed the limit set before the test.</span></div>' +
              '<div class="kw"><span class="term">EXP-BUN-003 · 3-book bundle banner</span><span class="pill keep">Keep</span><span class="why">+15% revenue per arm with CUPED, 8,373 per arm. Refunds normal.</span></div>' +
            "</div></div>" +
          '<div style="display:grid;gap:16px">' +
            '<div class="panel"><div class="panel-head"><span class="t">The checks on the checks</span></div>' +
              '<p><strong>A/A fixture</strong> — no false alarm. 1,000 splits, false positives inside [3.65%, 6.35%].</p>' +
              '<p style="margin-top:10px"><strong>Broken split</strong> — caught. Planted SRM detected at p &lt; 0.001.</p>' +
              '<p style="margin-top:10px"><strong>Coverage</strong> — 95% intervals cover the truth in [0.93, 0.97] over 500 seeds.</p></div>' +
            '<div class="panel"><div class="panel-head"><span class="t">What it feeds</span></div>' +
              '<p>The analysis rules, the Gold views and the daily run — never the library. Simulated rows and real rows never mix.</p></div>' +
          "</div>" +
        "</div>" +
        '<p class="note">This shows how a store decides with rules set in advance. It says nothing about your book.</p>' +
      "</div></section>";
  }

  /* ---------------- Nerds ---------------- */
  function viewNerds() {
    var map = window.Nerds && window.Nerds.map ? window.Nerds.map({ layout: "wide", lang: "en", id: "nxp", motion: false }) : "";
    $("#app").innerHTML =
      '<section class="view band dark" style="background:var(--deeper)"><div class="wrap">' +
        '<div class="view-head"><p class="eyebrow">For nerds</p><h1>The machine behind the screen.</h1>' +
        '<p class="lead">Three kinds of data, three lanes that never cross. Kafka carries only the simulated store; Duel votes and open data arrive as files.</p></div>' +
        '<div class="panel" style="padding:clamp(12px,2vw,24px);overflow:auto">' + map + "</div>" +
        '<div class="lessons" style="margin-top:24px">' +
          '<article class="lesson"><h4>Real people</h4><p>Duel votes land in a Cloudflare D1 database, leave once a day as one file, and fill the library only after five results per group.</p><p class="src writers">Shared by writers</p></article>' +
          '<article class="lesson"><h4>Real public tests</h4><p>4,873 Upworthy headline tests, CC BY 4.0. They become the Real lessons and the tools’ realistic expectations.</p><p class="src public">Real public tests</p></article>' +
          '<article class="lesson"><h4>Simulated</h4><p>70,000 fictional shoppers in a fictional store, carried by Kafka through a Databricks lakehouse. Proof of the math, never library data.</p><p class="src sim">Simulated</p></article>' +
        "</div>" +
      "</div></section>";
    if (window.Nerds && window.Nerds.style) window.Nerds.style(document);
  }

  /* ---------------- Plan ----------------
     The plan band lives on the landing, so this route renders home and scrolls to it. */
  function viewPlan() {
    var el = document.getElementById("plan");
    if (el) el.scrollIntoView();
    return true;
  }

  /* ---------------- Router ---------------- */
  function render() {
    setNav();
    var r = route();
    var homeEl = $("#home"), app = $("#app");
    if (r === "home" || r === "plan") {
      homeEl.hidden = false; app.hidden = true; app.innerHTML = "";
      if (!homeEl.dataset.built) { buildHome(); homeEl.dataset.built = "1"; }
      if (r === "plan") viewPlan(); else window.scrollTo(0, 0);
      return;
    }
    homeEl.hidden = true; app.hidden = false;
    if (r === "duel") viewDuel();
    else if (r === "play") viewPlay();
    else if (r === "doctor") viewDoctor();
    else if (r === "luck") viewLuck();
    else if (r === "library") viewLibrary();
    else if (r === "store") viewStore();
    else if (r === "nerds") viewNerds();
    window.scrollTo(0, 0);
  }

  /* ---------------- Public hooks ---------------- */
  window.BYD = {
    duelGo: function (step) {
      duel.step = step;
      if (step === "result" && duel.a + duel.b < TARGET) { duel.a = 165; duel.b = 165; }
      render();
    },
    vote: function (answer) {
      /* One vote is one reader in one arm, and the test stops at its target. */
      if (duel.a + duel.b >= TARGET) return;
      var arm = (duel.a + duel.b) % 2 === 0 ? "a" : "b";
      if (arm === "a") { duel.a++; if (answer === "yes") duel.yesA++; }
      else { duel.b++; if (answer === "yes") duel.yesB++; }
      render();
    },
    copy: function (b) {
      var t = "https://pipe199x.github.io/ebook-ab-platform/d/7KQ2";
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      b.textContent = "Copied";
      setTimeout(function () { b.textContent = "Copy"; }, 1400);
    },
    playVote: function () { playVotes++; playIdx++; render(); },
    docFilter: function (f) { doc.filter = f; render(); },
    luckSet: function (id, v) {
      var key = { bs: "bs", as2: "as", bd: "bd", ad: "ad" }[id];
      var n = Number(v);
      luck[key] = isFinite(n) && n >= 0 ? n : 0;
      render();
    },
    /* Test hooks */
    duelVerdict: duelVerdict, luckResult: luckResult, analyze: analyze,
    state: { duel: duel, luck: luck, doc: doc },
    sampleCSV: SAMPLE_CSV
  };

  window.addEventListener("hashchange", render);
  render();
  if (window.Nerds && window.Nerds.style) window.Nerds.style(document);

  /* Reveal on scroll; respects reduced motion through CSS. */
  try {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } catch (e) { $$(".reveal").forEach(function (el) { el.classList.add("in"); }); }
})();
