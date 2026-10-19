// Click through docs/plan/DEMO.html in headless Chrome and screenshot each state (offline).
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/check_demo.cjs <out-dir>
// Fails on console errors, any non-file request, horizontal overflow, or a broken flow.
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const url = "file://" + path.resolve(__dirname, "../docs/plan/DEMO.html");
const out = process.argv[2] || "demo-shots";
fs.mkdirSync(out, { recursive: true });
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTab(browser, mode, viewport) {
  const tab = await browser.newPage();
  await tab.setRequestInterception(true);
  tab.on("request", (r) => {
    if (r.url().startsWith("file://") || r.url().startsWith("data:")) r.continue();
    else { problems.push(`${mode}: network request to ${r.url()}`); r.abort(); }
  });
  tab.on("console", (m) => { if (m.type() === "error") problems.push(`${mode}: console error: ${m.text()}`); });
  tab.on("pageerror", (e) => problems.push(`${mode}: page error: ${e.message}`));
  await tab.setViewport(viewport);
  await tab.goto(url, { waitUntil: "load" });
  await wait(700);
  // Close the welcome balloon so it can't cover buttons the test clicks.
  await tab.evaluate(() => document.querySelector("#balloon .bx")?.click());
  const overflow = await tab.evaluate(() => [document.documentElement.scrollWidth - window.innerWidth, document.documentElement.scrollHeight - window.innerHeight]);
  check(overflow[0] <= 0 && overflow[1] <= 0, `${mode}: page scrolls (${overflow.join(", ")} px)`);
  return tab;
}
const winSel = (id) => `.win[data-app="${id}"]`;
async function shotWin(tab, id, name) {
  // Bring the window to the front the way a click would (the window manager focuses on pointerdown).
  await tab.$eval(winSel(id), (w) => { w.hidden = false; w.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
  const el = await tab.$(winSel(id));
  if (el) await el.screenshot({ path: `${out}/${name}.png` });
  else problems.push(`no window ${id} for screenshot ${name}`);
}
async function openIcon(tab, id) {
  await tab.evaluate((i) => {
    const el = document.querySelector(`.icon[data-open="${i}"]`);
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  }, id);
  await wait(250);
  check(await tab.$(winSel(id)), `icon ${id} did not open a window`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    /* ---------- Desktop ---------- */
    const tab = await newTab(browser, "desktop", { width: 1366, height: 800, deviceScaleFactor: 1 });
    await tab.screenshot({ path: `${out}/01-desktop.png` });
    check(await tab.$(winSel("readme")) && await tab.$(winSel("tool")), "default windows missing");

    // Drag Before You Decide by its title bar.
    const before = await tab.$eval(winSel("tool"), (w) => [w.offsetLeft, w.offsetTop]);
    const bar = await tab.$(`${winSel("tool")} .titlebar`);
    const bb = await bar.boundingBox();
    await tab.mouse.move(bb.x + 120, bb.y + 12);
    await tab.mouse.down();
    await tab.mouse.move(bb.x - 80, bb.y + 52, { steps: 6 });
    await tab.mouse.up();
    const after = await tab.$eval(winSel("tool"), (w) => [w.offsetLeft, w.offsetTop]);
    check(after[0] === before[0] - 200 && after[1] === before[1] + 40, `drag moved ${before} -> ${after}`);

    // Minimize, then restore from the taskbar.
    await tab.click(`${winSel("tool")} [data-act="min"]`);
    check(await tab.$eval(winSel("tool"), (w) => w.hidden), "minimize did not hide the window");
    const taskIndex = await tab.evaluate(() => [...document.querySelectorAll(".task span")].findIndex((s) => s.textContent === "Before You Decide"));
    await (await tab.$$(".task"))[taskIndex].click();
    check(!(await tab.$eval(winSel("tool"), (w) => w.hidden)), "taskbar did not restore the window");

    // Before You Decide: the community library opens first.
    const libCount = async () => Number((await tab.$eval("#l-card legend", (e) => e.textContent)).match(/([\d,]+) shared tests/)[1].replace(/,/g, ""));
    check(await tab.$eval('[data-panel="lib"]', (p) => !p.hidden), "the library tab is not the first view");
    console.log(`library: ${await tab.$eval("#l-card legend", (e) => e.textContent)}`);
    check((await libCount()) > 0, "library shows no shared tests");
    await shotWin(tab, "tool", "01b-library");
    await tab.click("#l-change-bundle");
    check((await tab.$eval("#l-card legend", (e) => e.textContent)).startsWith("Bundle offers"), "change type did not update the card");
    await tab.select("#l-genre", "fantasy");
    check((await tab.$eval("#l-card legend", (e) => e.textContent)).includes("fantasy writers"), "genre did not update the card");
    await tab.select("#l-genre", "romance");
    await tab.click("#l-plan");
    check(await tab.$eval('[data-panel="plan"]', (p) => !p.hidden), "Plan this test did not open the plan tab");
    check(await tab.$eval("#t-change-bundle", (r) => r.checked), "plan tab did not pick the bundle change");
    const bundleAnswer = await tab.$eval("#t-answer .ans-h", (e) => e.textContent);
    check(bundleAnswer === "Test the bundle offer in ads.", `bundle answer was "${bundleAnswer}"`);
    await tab.click("#t-change-cover");

    // Plan an ad test (María's example), then read five kinds of result.
    const answer = await tab.$eval("#t-answer .ans-h", (e) => e.textContent);
    check(answer === "Test the cover in ads.", `plan answer was "${answer}"`);
    const bars = await tab.$$eval("#t-bars .bval", (els) => els.map((e) => e.textContent.trim()));
    console.log(`plan bars (+50/+30/+20/+10%): ${bars.join(" | ")}`);
    check(["2 days", "4 days", "8 days", "28 days"].every((d, i) => bars[i].startsWith(d)), `plan days were ${bars.join(", ")}`);
    await shotWin(tab, "tool", "02-tool-plan");
    await tab.click("#t-change-title");
    const titleAnswer = await tab.$eval("#t-answer .ans-h", (e) => e.textContent);
    check(titleAnswer === "Test the title in ads.", `title answer was "${titleAnswer}"`);
    await tab.click("#t-change-cover");
    await tab.click("#tab-read");
    const setB = async (views, clicks) => {
      await tab.$eval("#r-bv", (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, String(views));
      await tab.$eval("#r-bc", (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, String(clicks));
      return tab.$eval("#r-verdict b", (e) => e.textContent);
    };
    const verdicts = { useB: await setB(20000, 312) };
    await tab.click("#r-details summary");
    await shotWin(tab, "tool", "03-tool-read");
    verdicts.close = await setB(20000, 245);
    verdicts.wait = await setB(20000, 270);
    await shotWin(tab, "tool", "03b-tool-not-sure");
    verdicts.unfair = await setB(30000, 312);
    verdicts.keepA = await setB(20000, 190);
    console.log(`verdicts: ${JSON.stringify(verdicts)}`);
    check(verdicts.useB === "Use B." && verdicts.close === "Too close to call." && verdicts.wait === "Not sure yet." &&
      verdicts.unfair === "Not fair yet." && verdicts.keepA === "Keep A.", `verdicts were ${JSON.stringify(verdicts)}`);
    await setB(20000, 312);

    // Share María's result: the library grows by one.
    await tab.click("#tab-lib");
    const nBefore = await libCount();
    await tab.click("#tab-read");
    await tab.click("#r-share");
    await wait(200);
    await tab.screenshot({ path: `${out}/03c-share-dialog.png` });
    await tab.evaluate(() => document.querySelector(".dlg-btns .btn.default").click());
    await wait(300);
    check(await tab.$eval("#r-share", (b) => b.disabled), "share button still active after sharing");
    await tab.click("#tab-lib");
    const nAfter = await libCount();
    check(nAfter === nBefore + 1, `library count ${nBefore} -> ${nAfter}`);
    await shotWin(tab, "tool", "03d-library-after-share");

    // Experiments (behind the scenes): select a row, open its memo.
    await openIcon(tab, "exp");
    await tab.click('#x-list tr[data-id="EXP-CHK-001"]');
    await tab.click("#x-memo");
    await wait(200);
    const memo = await tab.$eval("#memo-text", (e) => e.value);
    check(memo.includes("DECISION: SHIP"), "CHK memo missing its decision");
    await tab.click(`${winSel("memo")} [data-act="close"]`);
    await tab.click('#x-list tr[data-id="EXP-PDP-002"]');
    await shotWin(tab, "exp", "04-experiments");

    // Every icon opens a window.
    for (const id of ["lessons", "bin", "stream", "store", "run"]) await openIcon(tab, id);
    await shotWin(tab, "lessons", "05-lessons");
    await shotWin(tab, "readme", "06-readme");
    await shotWin(tab, "bin", "07-recycle-bin");

    // Bookstore: buy three books with the bundle, pay, download, refund.
    await tab.evaluate(() => document.querySelector('.win[data-app="store"] [data-act="max"]').click());
    await tab.click('.bk[data-book="pg-2000"]');
    await shotWin(tab, "store", "08-store-book");
    await tab.click("#s-add");
    for (const id of ["pg-84", "pg-11"]) {
      await tab.click("#s-back");
      await tab.click(`.bk[data-book="${id}"]`);
      await tab.click("#s-add");
    }
    await tab.click("#s-cartbtn");
    const cartText = await tab.$eval("#s-page", (e) => e.textContent);
    check(/3-book bundle/.test(cartText), "cart with 3 books shows no bundle discount");
    await shotWin(tab, "store", "09-store-cart");
    await tab.click("#s-go");
    const preselected = await tab.$('input[name="s-pay"]:checked');
    if (!preselected) await tab.click('input[name="s-pay"]');
    await shotWin(tab, "store", "10-store-checkout");
    await tab.click("#s-paybtn");
    await tab.click("[data-dl]");
    await tab.click("#s-refund");
    await shotWin(tab, "store", "11-store-thanks");
    await tab.evaluate(() => document.querySelector('.win[data-app="store"] [data-act="max"]').click());
    await tab.click("#s-why");
    await wait(200);
    await tab.screenshot({ path: `${out}/12-why-dialog.png` });
    await tab.evaluate(() => [...document.querySelectorAll(".dlg-btns .btn")].pop().click());

    // Event Stream shows our purchase in yellow.
    const mine = await tab.$$eval("#st-con .me", (els) => els.map((e) => e.textContent));
    check(mine.some((l) => l.includes("order_paid")), "event stream has no order_paid line of ours");
    check(mine.some((l) => l.includes("refund_issued")), "event stream has no refund_issued line of ours");
    await tab.click('.win[data-app="stream"] .tt');
    await shotWin(tab, "stream", "13-event-stream");

    // Daily Run to the end; Experiments shows the new date.
    await tab.$eval("#run-go", (b) => b.click());
    await wait(500);
    console.log(`run state after click: ${await tab.$eval("#run-state", (e) => e.textContent)}`);
    try {
      await tab.waitForFunction(() => document.querySelector("#run-state")?.textContent.startsWith("Last run: success"), { timeout: 20000 });
    } catch (e) {
      problems.push(`daily run did not finish: ${await tab.$eval("#run-state", (el) => el.textContent)}`);
    }
    await tab.$eval('.win[data-app="run"]', (w) => { w.style.zIndex = 99999; });
    await shotWin(tab, "run", "14-daily-run");
    const asOf = await tab.$eval(`${winSel("exp")} .toolbar`, (e) => e.textContent);
    check(asOf.includes("2026-10-16"), `Experiments not refreshed: ${asOf.trim()}`);

    // Language switch.
    await tab.click("#lang");
    await wait(200);
    const esTitle = await tab.$eval(`${winSel("tool")} .tt`, (e) => e.textContent);
    check(esTitle === "Antes de decidir", `ES title was "${esTitle}"`);
    await tab.evaluate(() => { for (const id of ["store", "stream", "run", "lessons", "readme", "bin"]) document.querySelector(`.win[data-app="${id}"] [data-act="min"]`)?.click(); });
    await tab.screenshot({ path: `${out}/15-spanish.png` });
    await tab.click("#lang");

    // Under the Hood: the live map counts Kafka events, lights up during a run, and explains each box.
    await openIcon(tab, "arch");
    await wait(2900);
    const kafkaLive = await tab.$eval('[data-live="kafka"]', (e) => e.textContent);
    check(/^[\d,]+ msgs? · \w+ p\d@\d+/.test(kafkaLive), `arch: kafka box shows "${kafkaLive}"`);
    await tab.$eval('[data-node="bridge"]', (b) => b.click());
    check((await tab.$eval("#ar-detail", (e) => e.textContent)).includes("lakehouse-bridge"), "arch: clicking a box did not show its details");
    await tab.$eval("#ar-run", (b) => b.click());
    await wait(2600);
    check((await tab.$$('.win[data-app="arch"] .node.hot')).length > 0, "arch: no box lit up during the run");
    check((await tab.$$('.win[data-app="arch"] .ar.on')).length > 0, "arch: no arrow flowing during the run");
    await shotWin(tab, "arch", "17-under-the-hood");
    await wait(7000);
    check(/^\+[1-9][\d,]* rows$/.test(await tab.$eval('[data-live="bronze"]', (e) => e.textContent)), "arch: Bronze count did not grow after the run");
    for (const k of ["stack", "try"]) {
      await tab.$eval(`.win[data-app="arch"] [data-tab="${k}"]`, (b) => b.click());
      check(await tab.$eval(`.win[data-app="arch"] [data-panel="${k}"]`, (p) => !p.hidden), `arch: tab ${k} did not open`);
      await shotWin(tab, "arch", `18-under-the-hood-${k}`);
    }
    await tab.$eval('.win[data-app="arch"] [data-act="close"]', (b) => b.click());

    // Start menu and About.
    await tab.click("#start");
    await tab.screenshot({ path: `${out}/16-start-menu.png` });
    await tab.click('[data-cmd="about"]');
    await wait(200);
    check((await tab.$$(".dlg")).length === 1, "About dialog did not open");
    await tab.evaluate(() => document.querySelector(".dlg-btns .btn").click());
    await tab.close();

    /* ---------- Phone ---------- */
    const phone = await newTab(browser, "phone", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await phone.screenshot({ path: `${out}/20-phone.png` });
    await phone.click("#start");
    await phone.click('#startmenu [data-open="store"]');
    await wait(300);
    await phone.screenshot({ path: `${out}/21-phone-store.png` });
    const maxed = await phone.$eval(winSel("store"), (w) => w.classList.contains("max"));
    check(maxed, "phone: store window is not full screen");
    await phone.click("#start");
    await phone.click('#startmenu [data-open="arch"]');
    await wait(300);
    await phone.screenshot({ path: `${out}/22-phone-under-the-hood.png` });
    const archOver = await phone.$eval('.win[data-app="arch"] .wbody', (w) => w.scrollWidth - w.clientWidth);
    check(archOver <= 0, `phone: Under the Hood scrolls sideways (${archOver} px)`);
    await phone.close();
  } finally {
    await browser.close();
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`ok: screenshots in ${out}`);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
