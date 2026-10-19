// Click through docs/plan/PLAN.html in headless Chrome and screenshot each state (offline).
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/check_companion.cjs <out-dir>
// Fails on console errors, any non-file request, or horizontal overflow at phone width.
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const page = "file://" + path.resolve(__dirname, "../docs/plan/PLAN.html");
const out = process.argv[2] || "companion-shots";
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const problems = [];
  try {
    for (const [mode, width, height, scheme] of [["desktop", 1280, 900, "light"], ["desktop-dark", 1280, 900, "dark"], ["phone", 390, 844, "light"]]) {
      const tab = await browser.newPage();
      await tab.setRequestInterception(true);
      tab.on("request", (r) => {
        if (r.url().startsWith("file://") || r.url().startsWith("data:")) r.continue();
        else { problems.push(`${mode}: network request to ${r.url()}`); r.abort(); }
      });
      tab.on("console", (m) => { if (m.type() === "error") problems.push(`${mode}: console error: ${m.text()}`); });
      tab.on("pageerror", (e) => problems.push(`${mode}: page error: ${e.message}`));
      await tab.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
      await tab.setViewport({ width, height, deviceScaleFactor: 1 });
      await tab.goto(page, { waitUntil: "load" });

      const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) problems.push(`${mode}: page scrolls sideways by ${overflow}px`);
      await tab.screenshot({ path: `${out}/${mode}-full.png`, fullPage: true });
      if (mode !== "desktop") { await tab.close(); continue; }

      const shot = async (selector, name) => {
        const el = await tab.$(selector);
        await el.screenshot({ path: `${out}/${name}.png` });
      };
      // Architecture: click every box; the panel must change title each time.
      const ids = await tab.$$eval(".box", (bs) => bs.map((b) => b.dataset.id));
      for (const id of ids) {
        await tab.click(`.box[data-id="${id}"]`);
        const title = await tab.$eval("#detail h3", (h) => h.textContent);
        const pressed = await tab.$eval(`.box[data-id="${id}"]`, (b) => b.getAttribute("aria-pressed"));
        if (!title || pressed !== "true") problems.push(`architecture: box ${id} did not select`);
      }
      await tab.click('.box[data-id="bridge"]');
      await shot("#architecture", "architecture-bridge");
      // Traffic tool: each preset, then a slider move.
      const presets = await tab.$$(".preset");
      for (let i = 0; i < presets.length; i++) {
        await presets[i].click();
        const mde = await tab.$eval("#mde", (e) => e.textContent);
        console.log(`preset ${i}: smallest lift in 4 weeks = ${mde}`);
        await shot("#traffic", `traffic-preset-${i}`);
      }
      await tab.$eval("#conv", (e) => { e.value = "8"; e.dispatchEvent(new Event("input")); });
      await shot("#traffic", "traffic-conv-8");
      await tab.hover(".chart-row:nth-child(2)");
      await shot("body", "traffic-tooltip");
      // Journey: step through all seven steps with the Next button.
      for (let i = 0; i < 7; i++) {
        const t = await tab.$eval("#stage h3", (h) => h.textContent);
        console.log(`step ${i + 1}: ${t}`);
        await shot("#journey", `journey-step-${i + 1}`);
        await tab.click("#stage .btn.primary");
      }
      // Timeline: every phase.
      const phases = await tab.$$(".g-row button");
      for (let i = 0; i < phases.length; i++) {
        await phases[i].click();
        const h = await tab.$eval("#phase-detail h3", (e) => e.textContent);
        if (!h.startsWith(`Phase ${i}`)) problems.push(`timeline: phase ${i} shows "${h}"`);
      }
      await phases[6].click();
      await shot("#timeline", "timeline-phase-6");
      await shot("#cost", "cost");
      await tab.close();
    }
  } finally {
    await browser.close();
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`ok: screenshots in ${out}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
