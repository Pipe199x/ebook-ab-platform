// Click through docs/investor/index.html in headless Chrome and check it, saving screens.
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/check_investor.cjs [out-dir]
// Fails on console errors, any request that is not a local file, sideways scrolling, a dead route,
// or a statistic that no longer matches the fixture.
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const page = path.resolve(__dirname, "../docs/investor/index.html");
const out = path.resolve(process.argv[2] || path.join(__dirname, "../docs/investor/shots"));
fs.mkdirSync(out, { recursive: true });

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const DOCTOR = { stop: 10, keep: 2, luck: 6, wait: 8, save: 189 };
const ROUTES = ["#home", "#duel", "#play", "#doctor", "#luck", "#library", "#store", "#nerds", "#plan"];

async function open(browser, viewport, hash, scheme = "dark") {
  const tab = await browser.newPage();
  await tab.setRequestInterception(true);
  tab.on("request", (r) => {
    const u = r.url();
    if (u.startsWith("file://") || u.startsWith("data:") || u.startsWith("blob:")) r.continue();
    else { problems.push(`network request to ${u}`); r.abort(); }
  });
  tab.on("console", (m) => { if (m.type() === "error") problems.push(`console error at ${hash}: ${m.text()}`); });
  tab.on("pageerror", (e) => problems.push(`page error at ${hash}: ${e.message}`));
  await tab.setViewport(viewport);
  await tab.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await tab.goto(`file://${page}${hash}`, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  await wait(200);
  return tab;
}
const shot = async (tab, name) => {
  await tab.evaluate(() => window.scrollTo(0, 0));
  await wait(80);
  await tab.screenshot({ path: path.join(out, name) });
};
const sideways = async (tab, where) => {
  const o = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(o <= 0, `${where}: scrolls sideways (${o} px)`);
};

(async () => {
  const launch = { headless: "shell", args: ["--no-sandbox", "--disable-gpu"] };
  const shell = "/home/horse/.cache/puppeteer/chrome-headless-shell/linux-155.0.8059.79/chrome-headless-shell-linux64/chrome-headless-shell";
  if (fs.existsSync(shell)) launch.executablePath = shell;
  const browser = await puppeteer.launch(launch);

  // 1. Every route renders, with no network and no sideways scroll.
  for (const hash of ROUTES) {
    const tab = await open(browser, DESKTOP, hash);
    const text = await tab.evaluate(() => document.body.innerText.length);
    check(text > 400, `${hash}: almost no content rendered (${text} chars)`);
    const hasChip = await tab.evaluate(() =>
      [...document.querySelectorAll(".chip, .pill")].some((e) => /Demo · sample data|Simulated|Shared by writers|Real public tests/i.test(e.textContent)));
    check(hasChip, `${hash}: no source badge or demo chip on screen`);
    await sideways(tab, hash);
    await shot(tab, `${hash.replace(/[#/]/g, "") || "home"}-desktop.png`);
    await tab.close();
  }

  // 2. Phone width on the two heaviest routes.
  for (const hash of ["#home", "#duel"]) {
    const tab = await open(browser, PHONE, hash);
    await sideways(tab, `${hash} @390`);
    await shot(tab, `${hash.replace(/[#/]/g, "") || "home"}-phone.png`);
    await tab.close();
  }

  // 3. Statistics match the fixtures.
  const tab = await open(browser, DESKTOP, "#duel");
  const win = await tab.evaluate(() => {
    const v = window.BYD.duelVerdict({ nA: 165, nB: 165, yesA: 40, yesB: 68 });
    return { kind: v.kind, arm: v.arm, p: v.z.p, ci: v.z.ci };
  });
  check(win.kind === "win" && win.arm === "B", `Duel 40/165 vs 68/165 should be a clear win for B, got ${win.kind}/${win.arm}`);
  check(win.p < 0.05 && (win.ci[0] > 0 || win.ci[1] < 0), `Duel win must be agreed by both the test and the interval, got p=${win.p} ci=${win.ci}`);

  const tooClose = await tab.evaluate(() => window.BYD.duelVerdict({ nA: 165, nB: 165, yesA: 80, yesB: 84 }).kind);
  check(tooClose === "close", `Duel 80 vs 84 should be "close", got ${tooClose}`);

  const unfair = await tab.evaluate(() => window.BYD.duelVerdict({ nA: 240, nB: 90, yesA: 120, yesB: 45 }).kind);
  check(unfair === "unfair", `Duel 240 vs 90 should be "unfair", got ${unfair}`);

  const early = await tab.evaluate(() => window.BYD.duelVerdict({ nA: 3, nB: 2, yesA: 1, yesB: 1 }).kind);
  check(early === "early", `a 5-reader Duel should not have the split judged, got ${early}`);

  const unsure = await tab.evaluate(() => window.BYD.duelVerdict({ nA: 165, nB: 165, yesA: 52, yesB: 62 }));
  check(unsure.kind === "close" || unsure.kind === "unsure", `Duel 52 vs 62 should be close or unsure, got ${unsure.kind}`);
  await tab.close();

  const doc = await open(browser, DESKTOP, "#doctor");
  const res = await doc.evaluate(() => {
    const r = window.BYD.analyze(window.BYD.sampleCSV, 3.4, 30);
    return { counts: r.counts, save: Math.round(r.save) };
  });
  check(res.counts.stop === DOCTOR.stop, `Ad Doctor Stop should be ${DOCTOR.stop}, got ${res.counts.stop}`);
  check(res.counts.keep === DOCTOR.keep, `Ad Doctor Keep should be ${DOCTOR.keep}, got ${res.counts.keep}`);
  check(res.counts.luck === DOCTOR.luck, `Ad Doctor Luck should be ${DOCTOR.luck}, got ${res.counts.luck}`);
  check(res.counts.wait === DOCTOR.wait, `Ad Doctor Wait should be ${DOCTOR.wait}, got ${res.counts.wait}`);
  check(res.save === DOCTOR.save, `Ad Doctor monthly saving should be USD ${DOCTOR.save}, got ${res.save}`);
  await doc.close();

  const luck = await open(browser, DESKTOP, "#luck");
  const notYet = await luck.evaluate(() => window.BYD.luckResult({ bs: 9, bd: 7, as: 14, ad: 7 }));
  check(notYet.kind === "unsure", `9 -> 14 over 7 days should be unsure, got ${notYet.kind}`);
  check(notYet.extraBefore >= 7 && notYet.extraAfter >= 7, `"more days" must be EXTRA days, got ${notYet.extraBefore}/${notYet.extraAfter}`);
  const real = await luck.evaluate(() => window.BYD.luckResult({ bs: 9, bd: 7, as: 31, ad: 7 }));
  check(real.kind === "real" && real.pv < 0.001, `9 -> 31 should be real with p < .001, got ${real.kind}/${real.pv}`);
  const nineThirty = await luck.evaluate(() => window.BYD.luckResult({ bs: 9, bd: 7, as: 30, ad: 7 }));
  check(nineThirty.pv > 0.001 && nineThirty.pv < 0.002, `9 -> 30 is p = 1.065e-3, not under 1e-3, got ${nineThirty.pv}`);
  const same = await luck.evaluate(() => window.BYD.luckResult({ bs: 9, bd: 7, as: 9, ad: 7 }).kind);
  check(same === "same", `9 -> 9 should be "same", got ${same}`);
  const frac = await luck.evaluate(() => window.BYD.luckResult({ bs: 9.5, bd: 7, as: 14, ad: 7 }).kind);
  check(frac === "bad", `a fractional sales count must be rejected, got ${frac}`);
  const down = await luck.evaluate(() => window.BYD.luckResult({ bs: 30, bd: 7, as: 9, ad: 7 }));
  check(down.kind === "real" && down.dir === "down", `30 -> 9 should be a real drop, got ${down.kind}/${down.dir}`);
  await luck.close();

  // 4. The disabled-free result gate: the Duel never shows a winner before the end.
  const gate = await open(browser, DESKTOP, "#duel");
  await gate.evaluate(() => window.BYD.duelGo("vote"));
  const midText = await gate.evaluate(() => document.body.innerText);
  check(!/chose version/i.test(midText), "the Duel shows a winner while the test is still running");
  check(/winner stays hidden/i.test(midText), "the Duel progress view lost its no-peeking line");
  await gate.close();

  // 5. The Ad Doctor's "nothing leaves the browser" claim: no send attempts, no resources, no cookies.
  const net = await open(browser, DESKTOP, "#doctor");
  const receipt = await net.evaluate(async () => {
    const el = document.getElementById("netcheck");
    return el ? el.textContent : "";
  });
  check(/Network check: 0 requests, 0 blocked send attempts, 0 cookies/.test(receipt),
    `the Ad Doctor network receipt should show a clean page, got: ${receipt}`);
  await net.close();

  await browser.close();
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    problems.forEach((p) => console.error(" - " + p));
    process.exit(1);
  }
  console.log(`ok: ${ROUTES.length} routes, phone and desktop, statistics match the fixtures`);
  console.log(`screens in ${out}`);
})();
