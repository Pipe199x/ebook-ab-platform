// Render static HTML pages (plan charts and website mockups) to PNG, offline,
// with the headless Chrome that mermaid-cli already installed.
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/render_html.cjs <page.html>...
// Each page sets its size on <body data-render="WIDTHxHEIGHT@SCALE">; the PNG is written next to it.
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const pages = process.argv.slice(2);
  if (!pages.length) throw new Error("no pages given");
  // "shell" = chrome-headless-shell, the browser mermaid-cli installed (same as render/puppeteer.json).
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const tab = await browser.newPage();
    // Offline by construction: any request that is not a local file fails the render.
    await tab.setRequestInterception(true);
    tab.on("request", (req) => (req.url().startsWith("file://") ? req.continue() : req.abort()));
    const errors = [];
    tab.on("pageerror", (err) => errors.push(err.message));
    tab.on("requestfailed", (req) => errors.push(`request failed: ${req.url()}`));

    for (const page of pages) {
      errors.length = 0;
      const url = "file://" + path.resolve(page);
      await tab.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
      await tab.goto(url, { waitUntil: "load" });
      const spec = await tab.evaluate(() => document.body.dataset.render || "");
      const m = spec.match(/^(\d+)x(\d+)@(\d+)$/);
      if (!m) throw new Error(`${page}: missing <body data-render="WxH@S">`);
      const [width, height, scale] = m.slice(1).map(Number);
      await tab.setViewport({ width, height, deviceScaleFactor: scale });
      await tab.goto(url, { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      const overflow = await tab.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
      if (overflow[0] > width || overflow[1] > height) errors.push(`content ${overflow.join("x")} overflows ${width}x${height}`);
      if (errors.length) throw new Error(`${page}:\n  ${errors.join("\n  ")}`);
      const png = page.replace(/\.html$/, ".png");
      await tab.screenshot({ path: png, clip: { x: 0, y: 0, width, height } });
      console.log(`rendered ${png} (${width * scale}x${height * scale})`);
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
