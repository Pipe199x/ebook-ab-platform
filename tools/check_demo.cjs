// Click through docs/plan/DEMO.html (the demo of the final product) in headless Chrome, check it, and save its screens:
// the plan uses some (docs/plan/shots/) and so does the lifesaver answer (docs/plan/answers/figs/ls-*.png).
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/check_demo.cjs [out-dir] [review-dir]
//   out-dir defaults to docs/plan/answers/figs. With review-dir, it also saves extra screens for a human look
//   (full pages, desktop home, dark mode) that no document uses.
// Fails on console errors, any request that is not a local file, sideways scrolling, or a broken flow.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer");

const page = path.resolve(__dirname, "../docs/plan/DEMO.html");
const out = path.resolve(process.argv[2] || path.join(__dirname, "../docs/plan/answers/figs"));
const review = process.argv[3] ? path.resolve(process.argv[3]) : null;
fs.mkdirSync(out, { recursive: true });
if (review) fs.mkdirSync(review, { recursive: true });
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1366, height: 900, deviceScaleFactor: 1 };
// The example Ad Doctor report must always give the same verdicts (a regression check on the model).
const DOCTOR = { stop: 8, keep: 2, luck: 6, wait: 8, save: 142 };

async function open(browser, mode, viewport, query, hash = "", scheme = "light") {
  const tab = await browser.newPage();
  await tab.setRequestInterception(true);
  tab.on("request", (r) => {
    const u = r.url();
    if (u.startsWith("file://") || u.startsWith("data:") || u.startsWith("blob:")) r.continue();
    else { problems.push(`${mode}: network request to ${u}`); r.abort(); }
  });
  tab.on("console", (m) => { if (m.type() === "error") problems.push(`${mode}: console error: ${m.text()}`); });
  tab.on("pageerror", (e) => problems.push(`${mode}: page error: ${e.message}`));
  await tab.setViewport(viewport);
  await tab.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await tab.goto(`file://${page}?${query}${hash ? "#" + hash : ""}`, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  return tab;
}
const click = async (tab, sel) => { await tab.$eval(sel, (b) => b.click()); await wait(120); };
const text = (tab, sel) => tab.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const view = (tab) => tab.$eval("#main", (m) => `${m.dataset.view}${m.dataset.step ? ":" + m.dataset.step : ""}`);
async function sideways(tab, where) {
  const o = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(o <= 0, `${where}: the page scrolls sideways (${o} px)`);
}
async function screen(tab, name) {
  await tab.evaluate(() => window.scrollTo(0, 0));
  await wait(80);
  await tab.screenshot({ path: path.join(out, name) });
}
async function look(tab, name, fullPage = false) {
  if (!review) return;
  await tab.evaluate(() => window.scrollTo(0, 0));
  await wait(80);
  await tab.screenshot({ path: path.join(review, name), fullPage });
}
const bgOf = (tab, sel) => tab.$eval(sel, (e) => getComputedStyle(e).backgroundImage.slice(0, 30));
async function element(tab, sel, name) {
  const el = await tab.$(sel);
  if (!el) { problems.push(`no ${sel} for ${name}`); return; }
  await el.screenshot({ path: path.join(out, name) });
}
// An element, cut to its first maxH CSS pixels (for long lists).
async function elementTop(tab, sel, name, maxH) {
  const el = await tab.$(sel);
  if (!el) { problems.push(`no ${sel} for ${name}`); return; }
  await el.evaluate((e, h) => { e.dataset.cut = e.style.cssText; e.style.maxHeight = h + "px"; e.style.overflow = "hidden"; }, maxH);
  await el.screenshot({ path: path.join(out, name) });
  await el.evaluate((e) => { e.style.cssText = e.dataset.cut; delete e.dataset.cut; });
}
async function setValue(tab, sel, value, event = "change") {
  await tab.$eval(sel, (el, v, ev) => { el.value = v; el.dispatchEvent(new Event(ev, { bubbles: true })); }, value, event);
  await wait(120);
}
// From the create step: pick what readers "really think", fill the Duel and open the result.
async function duelTo(tab, scenario) {
  await click(tab, '[data-act="create"]');
  await click(tab, '[data-act="progress"]');
  await setValue(tab, "#scenario", scenario);
  await click(tab, '[data-act="fill"]');
  await click(tab, '[data-act="reveal"]');
  return tab.$eval("#verdict", (v) => v.dataset.kind);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    /* ---------- Phone, English: the Duel from start to result ---------- */
    const tab = await open(browser, "phone", PHONE, "seed=7&lang=en");
    check((await tab.evaluate(() => window.__ls.target)) === 330, "the Duel target is not 330 readers");
    check((await view(tab)) === "home", "the page does not open on the home screen");
    // The three fonts are embedded (no network), and the paintings are drawn on the page.
    const fonts = await tab.evaluate(() => ["Instrument Sans", "EB Garamond", "Geist Mono"].map((f) => [f, [...document.fonts].some((x) => x.family.replace(/"/g, "") === f && x.status === "loaded")]));
    for (const [f, ok] of fonts) check(ok, `the font ${f} did not load from the page itself`);
    check((await bgOf(tab, ".art-hero")).startsWith('url("data:image/jpeg'), "the home painting is missing");
    check((await tab.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(247, 247, 244)", "the light background is not the paper color");
    await sideways(tab, "home");
    await screen(tab, "ls-home.png");
    await look(tab, "phone-home-full.png", true);
    // The phone menu opens, lists the tools, and closes after a choice.
    await click(tab, "#menubtn");
    check(!(await tab.$eval("#menu", (m) => m.hidden)), "the phone menu did not open");
    await look(tab, "phone-menu.png");
    await click(tab, '#menulist [data-view="doctor"]');
    check((await view(tab)) === "doctor" && (await tab.$eval("#menu", (m) => m.hidden)), "the phone menu did not open the Ad Doctor and close");
    await click(tab, '[data-act="back"]');

    await click(tab, '[data-act="go"][data-view="duel"]');
    check((await view(tab)) === "duel:create", "Start a Duel did not open the create step");
    await sideways(tab, "create");
    await screen(tab, "ls-create.png");
    for (const k of ["title", "blurb", "idea", "cover"]) {
      await click(tab, `[data-act="kind"][data-kind="${k}"]`);
      await sideways(tab, `create (${k})`);
    }

    await click(tab, '[data-act="create"]');
    check((await view(tab)) === "duel:link", "Create my Duel did not show the link");
    check((await text(tab, "#dlink")).endsWith("/d/7KQ2"), "the Duel link is wrong");
    await sideways(tab, "link");
    await screen(tab, "ls-link.png");

    await click(tab, '[data-act="reader"]');
    check((await view(tab)) === "duel:reader", "See what readers see did not open the reader view");
    await sideways(tab, "reader");
    await screen(tab, "ls-reader.png");
    await click(tab, '[data-act="vote"][data-v="yes"]');
    check((await text(tab, "#screen")).includes("Thank you"), "a vote did not show the thank-you page");
    await screen(tab, "ls-thanks.png");
    // Every reader gets one version at random: across a dozen readers both must appear.
    const arms = new Set();
    for (let i = 0; i < 12; i++) {
      await click(tab, '[data-act="next"]');
      arms.add(await tab.$eval(".book", (b) => b.dataset.arm));
      await click(tab, `[data-act="vote"][data-v="${i % 3 ? "no" : "yes"}"]`);
    }
    check(arms.has("A") && arms.has("B"), `readers saw only version(s) ${[...arms].join(",")}`);

    await click(tab, '[data-act="progress"]');
    check((await view(tab)) === "duel:progress", "See my progress did not open the progress step");
    check(await tab.$eval('[data-act="reveal"]', (b) => b.disabled), "the result opened before the target");
    for (let i = 0; i < 3; i++) await click(tab, '[data-act="add"]');
    check((await text(tab, "#splitok")) === "looks fair", "a 50/50 split is not reported as fair");
    await sideways(tab, "progress");
    await screen(tab, "ls-progress.png");

    await click(tab, '[data-act="fill"]');
    check(!(await tab.$eval('[data-act="reveal"]', (b) => b.disabled)), "the result did not open at the target");
    await click(tab, '[data-act="reveal"]');
    const won = await tab.evaluate(() => {
      const v = window.__ls.state.duel.votes;
      const z = window.ABStats.zTest(v.A.yes, v.A.n, v.B.yes, v.B.n);
      return { kind: document.querySelector("#verdict").dataset.kind, p: z.p, diff: z.diff, text: document.querySelector("#verdict h2").textContent, votes: v };
    });
    check(won.kind === "win" && won.p < 0.05 && won.diff > 0 && won.text.includes("version B"), `"B is clearly better" gave ${JSON.stringify(won)}`);
    await sideways(tab, "reveal");
    await screen(tab, "ls-reveal.png");
    await element(tab, "#verdict", "ls-verdict.png");
    await element(tab, "#sharecard", "ls-card.png");
    console.log(`duel: ${won.text} (p = ${won.p.toExponential(2)})`);

    await click(tab, '[data-act="go"][data-view="duel"][data-reset]');
    const close = await duelTo(tab, "close");
    check(close === "close" || close === "unsure", `"almost the same" gave ${close}`);
    await click(tab, '[data-act="go"][data-view="duel"][data-reset]');
    const broken = await duelTo(tab, "broken");
    check(broken === "unfair", `a broken split gave ${broken}, not "Not fair yet"`);
    await screen(tab, "ls-unfair.png");
    console.log(`duel scenarios: almost the same -> ${close}; broken split -> ${broken}`);

    /* ---------- Which would you read? ---------- */
    await click(tab, '[data-act="back"]');
    await click(tab, '[data-act="back"]');
    await click(tab, '[data-act="back"]');
    await click(tab, '[data-act="back"]');
    check((await view(tab)) === "home", "Back did not lead home");
    await click(tab, '[data-act="go"][data-view="play"]');
    await sideways(tab, "play");
    await screen(tab, "ls-play.png");
    for (let i = 0; i < 8; i++) await click(tab, `[data-act="pvote"][data-v="${i % 2 ? "no" : "yes"}"]`);
    check((await text(tab, "#voted")) === "8", "the game did not count 8 votes");

    /* ---------- Ad Doctor on the example report ---------- */
    await click(tab, '[data-act="back"]');
    await click(tab, '[data-act="go"][data-view="doctor"]');
    const doc = await tab.evaluate(() => ({
      stop: +document.querySelector("#n-stop").textContent, keep: +document.querySelector("#n-keep").textContent,
      luck: +document.querySelector("#n-luck").textContent, wait: +document.querySelector("#n-wait").textContent,
      save: Math.round(window.__ls.analyze().save),
    }));
    console.log(`ad doctor: ${JSON.stringify(doc)}`);
    for (const k of Object.keys(DOCTOR)) check(doc[k] === DOCTOR[k], `ad doctor ${k} = ${doc[k]}, expected ${DOCTOR[k]}`);
    await sideways(tab, "doctor");
    await screen(tab, "ls-doctor.png");
    await click(tab, '[data-act="filter"][data-f="stop"]');
    check((await tab.$$eval(".kw", (k) => k.every((x) => x.dataset.verdict === "stop") && k.length)) === DOCTOR.stop, "the Stop filter does not show only the Stop keywords");
    await elementTop(tab, "#kwlist", "ls-doctor-stop.png", 400);
    await setValue(tab, "#royalty", "6.5", "input");
    const richer = await tab.evaluate(() => window.__ls.analyze().counts.stop);
    check(richer < DOCTOR.stop, "a higher royalty did not reduce the keywords to stop");

    /* ---------- Real or luck? ---------- */
    await click(tab, '[data-act="back"]');
    await click(tab, '[data-act="go"][data-view="luck"]');
    const luck = await text(tab, "#luckv");
    check(luck.includes("about 2 times in 5") && luck.includes("can't tell yet"), `9 -> 14 sales gave: ${luck}`);
    await sideways(tab, "luck");
    await screen(tab, "ls-luck.png");
    await setValue(tab, "#as", "30", "input");
    check((await tab.$eval("#luckv", (v) => v.dataset.kind)) === "real", "9 -> 30 sales is not called real");
    await tab.close();

    /* ---------- Spanish ---------- */
    const es = await open(browser, "phone-es", PHONE, "seed=7&lang=es");
    check((await text(es, "h1")) === "¿Vas a decidir algo de tu libro?", "the Spanish home title is wrong");
    await screen(es, "ls-es-home.png");
    await look(es, "phone-es-home-full.png", true);
    await click(es, '[data-act="go"][data-view="duel"]');
    await click(es, '[data-act="create"]');
    await click(es, '[data-act="reader"]');
    check((await text(es, ".ask")) === "¿Leerías la primera página?", "the Spanish reader question is wrong");
    await sideways(es, "reader (es)");
    await screen(es, "ls-es-reader.png");
    await click(es, "#lang");
    check((await text(es, ".ask")) === "Would you read the first page?", "the language button did not switch to English");
    await es.close();

    /* ---------- Uploads: a cover and two CSV files ---------- */
    const up = await open(browser, "uploads", PHONE, "seed=3&lang=en", "duel");
    await (await up.$("#upA")).uploadFile(path.resolve(__dirname, "../docs/plan/charts/small_seller.png"));
    await up.waitForSelector(".slot.a img.cv", { timeout: 5000 }).catch(() => problems.push("an uploaded cover did not appear"));
    const kb = await up.evaluate(() => window.__ls.state.duel.up.A && window.__ls.state.duel.up.A.kb);
    check(kb > 0 && kb < 200, `an uploaded cover weighs ${kb} KB after shrinking`);
    console.log(`upload: a 1000x560 chart becomes a ${kb} KB cover`);
    await click(up, '[data-act="back"]');
    await click(up, '[data-act="go"][data-view="doctor"]');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ls-"));
    const es1 = path.join(tmp, "informe.csv");
    fs.writeFileSync(es1, "Término de búsqueda del cliente;Clics;Gasto;Pedidos totales de 7 días (#)\nnovela;120;48,00;1\nromance;60;12,00;9\nlibros;8;2,40;0\n");
    await (await up.$("#csv")).uploadFile(es1);
    await wait(300);
    const mine = await up.evaluate(() => window.__ls.analyze() && window.__ls.analyze().kws.map((k) => `${k.term}:${k.verdict}`).join(" "));
    check(/novela:stop/.test(mine || "") && /romance:keep/.test(mine || ""), `a Spanish CSV (semicolons, decimal commas) gave: ${mine}`);
    const bad = path.join(tmp, "notes.csv");
    fs.writeFileSync(bad, "hello,world\n1,2\n");
    await (await up.$("#csv")).uploadFile(bad);
    await wait(300);
    check((await up.$(".err")) !== null, "a CSV without the right columns shows no error");
    fs.rmSync(tmp, { recursive: true, force: true });
    await up.close();

    /* ---------- Desktop: the home page, the app window with the "behind the screen" pane, the theme switch ---------- */
    const home = await open(browser, "desktop-home", DESKTOP, "seed=7&lang=en");
    const painted = await home.evaluate(() => window.__ls.paintings().sort().join(","));
    check(painted === "cliffs,dusk,harbor,meadow", `the desktop home painted ${painted}`);
    await sideways(home, "desktop home");
    await screen(home, "ls-desktop-home.png");
    await look(home, "desktop-home-full.png", true);
    await home.close();
    const desk = await open(browser, "desktop", DESKTOP, "seed=7&lang=en", "duel");
    await click(desk, '[data-act="create"]');
    await click(desk, '[data-act="reader"]');
    check(await desk.$eval("#why", (d) => d.open), "the rail is closed on a wide screen");
    check((await bgOf(desk, "#stageArt")).startsWith('url("data:image/jpeg'), "the app window has no painting behind it");
    await sideways(desk, "desktop");
    await screen(desk, "ls-desktop.png");
    await click(desk, '[data-act="theme"][data-set="dark"]');
    const darkBg = await desk.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]);
    check(darkBg[0] === "dark" && darkBg[1] === "rgb(20, 18, 11)", `the dark theme button gave ${darkBg}`);
    await look(desk, "desktop-reader-dark.png");
    await click(desk, '[data-act="theme"][data-set="system"]');
    check(await desk.evaluate(() => !("theme" in document.documentElement.dataset)), "the system theme button did not clear the choice");
    await desk.close();
    const dark = await open(browser, "dark", PHONE, "seed=7&lang=en", "", "dark");
    const bg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check(bg === "rgb(20, 18, 11)", `dark mode shows the background ${bg}`);
    await look(dark, "phone-dark-home.png");
    await click(dark, "#menubtn");
    check((await text(dark, "#menulist")).includes("For nerds"), "the phone menu does not list For nerds");
    await dark.close();

    /* ---------- For nerds: the map of the machine, its cards, stories, filters and the stack ---------- */
    const press = (tab, sel) => tab.$eval(sel, (g) => g.dispatchEvent(new MouseEvent("click", { bubbles: true }))).then(() => wait(120));
    // Every text in a box must stay inside the box (wrapping counts characters, so measure the real glyphs).
    const overflow = (tab) => tab.evaluate(() => [...document.querySelectorAll("#ndmap .node")].flatMap((g) => {
      const r = g.querySelector("rect.box").getBBox();
      return [...g.querySelectorAll("text")].filter((x) => { const b = x.getBBox(); return b.x < r.x + 1 || b.x + b.width > r.x + r.width - 1; })
        .map((x) => `${g.dataset.node}: "${x.textContent}"`);
    }));
    const nd = await open(browser, "nerds-desktop", DESKTOP, "seed=7&lang=en", "nerds");
    check((await view(nd)) === "nerds", "#nerds did not open the For nerds tab");
    check((await nd.$$eval("#nav button", (b) => b.length)) === 5, "the top menu does not list five tabs");
    check((await nd.$eval("#ndmap", (m) => m.dataset.layout)) === "wide", "a 1366 px screen does not get the wide map");
    const ids = await nd.evaluate(() => Object.keys(window.__ls.nerds.NODES));
    const drawn = await nd.$$eval("#ndmap .node", (g) => g.map((x) => x.dataset.node));
    check(ids.length === 19 && ids.every((id) => drawn.includes(id)), `the map draws ${drawn.length} of ${ids.length} boxes`);
    check((await nd.$$eval("#ndmap .pk animateMotion", (a) => a.length)) >= 8, "no packets travel the lanes");
    let over = await overflow(nd);
    check(!over.length, `labels overflow their boxes: ${over.join("; ")}`);
    await sideways(nd, "nerds desktop");
    await element(nd, "#ndart", "nerds-map.png");
    await look(nd, "nerds-desktop.png", true);
    for (const id of ids) {
      await press(nd, `#ndmap .node[data-node="${id}"]`);
      const shown = await text(nd, "#ndtitle");
      check(shown === (await nd.evaluate((k) => window.__ls.nerds.NODES[k].t.en, id)), `the ${id} box opened the card "${shown}"`);
    }
    // The vote story walks twelve steps from the reader to the library; nothing simulated ever reaches the library.
    await click(nd, '[data-act="nstory"][data-story="vote"]');
    const n = await nd.evaluate(() => window.__ls.nerds.STORIES.find((s) => s.k === "vote").steps.length);
    for (let i = 1; i < n; i++) await click(nd, '[data-act="nstep"][data-dir="1"]');
    check((await nd.$eval("#ndmap .node.hot", (g) => g.dataset.node)) === "library", "the vote story does not end at the library");
    check((await text(nd, "#ndcap .k")).includes(`Step ${n} of ${n}`), "the story caption does not count its steps");
    await look(nd, "nerds-story.png");
    const simAtLibrary = await nd.evaluate(() => {
      const M = window.__ls.nerds, lib = M.LAYOUTS.wide.nodes.library;
      const lane = M.LAYOUTS.wide.lanes.find((l) => l.kind === "sim"), end = lane.pts[lane.pts.length - 1];
      return M.STORIES.some((s) => s.kind === "sim" && s.steps.some(([id]) => id === "library")) || (end[1] >= lib.y && end[1] <= lib.y + lib.h);
    });
    check(!simAtLibrary, "simulated data reaches the library on the map");
    await click(nd, '[data-act="nclose"]');
    await click(nd, '[data-act="nfilter"][data-kind="sim"]');
    check((await nd.$eval("#ndmap .nx", (s) => s.getAttribute("data-filter"))) === "sim", "the Simulated filter did not apply");
    const dbx = await nd.evaluate(() => window.__ls.nerds.TOOLS.findIndex((x) => /Databricks Free Edition/.test(typeof x.name === "string" ? x.name : x.name.en)));
    await click(nd, `[data-act="ntool"][data-i="${dbx}"]`);
    check((await nd.$$eval("#ndmap .node.lit", (g) => g.length)) >= 4, "the Databricks row lights fewer than four boxes");
    await click(nd, '[data-act="nmotion"]');
    check(await nd.$eval("#ndmap .nx", (s) => s.animationsPaused() && s.classList.contains("paused")), "Pause motion did not pause the map");
    await click(nd, '[data-act="theme"][data-set="dark"]');
    await look(nd, "nerds-dark.png");
    await click(nd, '[data-act="theme"][data-set="system"]');
    await nd.close();
    // A phone gets the tall map, in Spanish, with no raw keys and no label outside its box.
    const np = await open(browser, "nerds-phone", PHONE, "seed=7&lang=es", "nerds");
    check((await np.$eval("#ndmap", (m) => m.dataset.layout)) === "tall", "a phone does not get the tall map");
    await sideways(np, "nerds phone");
    over = await overflow(np);
    check(!over.length, `Spanish labels overflow on a phone: ${over.join("; ")}`);
    if (review) await (await np.$("#ndart")).screenshot({ path: path.join(review, "nerds-phone-map.png") });
    check(!(await np.evaluate(() => /\bnd\.[a-z]/.test(document.body.innerText))), "the For nerds tab shows a raw text key");
    await click(np, '[data-act="nstory"][data-story="shopper"]');
    check((await text(np, "#ndcap .k")).includes("Paso 1 de 8"), "the Spanish story caption is wrong");
    await look(np, "nerds-phone-es.png", true);
    await np.close();
    // With reduced motion the map stands still: no packets, no walking dashes.
    const still = await open(browser, "nerds-still", DESKTOP, "seed=7&lang=en", "nerds");
    await still.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
    await still.reload({ waitUntil: "load" });
    check((await still.$$eval("#ndmap .pk", (p) => p.length)) === 0, "reduced motion still draws traveling packets");
    check((await still.$eval("#ndmap .lane.real", (l) => getComputedStyle(l).animationName)) === "none", "reduced motion still walks the lanes");
    await still.close();
  } finally {
    await browser.close();
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`ok: screens in ${out}`);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
