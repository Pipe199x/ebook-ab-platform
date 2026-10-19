// Print a static HTML document to an A4 PDF, offline, with the headless Chrome that mermaid-cli already installed.
// Usage (inside WSL): NODE_PATH=~/.local/opt/mmdc/node_modules node tools/render_pdf.cjs <doc.html> <out.pdf>
// The page sets its own margins with CSS @page; <html data-header="..."> gives the running header text.
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) throw new Error("usage: render_pdf.cjs <doc.html> <out.pdf>");
  // "shell" = chrome-headless-shell, the browser mermaid-cli installed (same as render/puppeteer.json).
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const tab = await browser.newPage();
    // Offline by construction: any request that is not a local file fails the print.
    await tab.setRequestInterception(true);
    tab.on("request", (req) => (req.url().startsWith("file://") ? req.continue() : req.abort()));
    const errors = [];
    tab.on("pageerror", (err) => errors.push(err.message));
    tab.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });
    tab.on("requestfailed", (req) => errors.push(`request failed: ${req.url()}`));

    await tab.goto("file://" + path.resolve(src), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    const header = await tab.evaluate(() => document.documentElement.dataset.header || document.title);
    if (errors.length) throw new Error(`${src}:\n  ${errors.join("\n  ")}`);

    const small = "font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 7.5pt; color: #696969; width: 100%; margin: 0 16mm;";
    await tab.pdf({
      path: out,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="${small} display: flex;"><span>${header.replace(/[<>&]/g, "")}</span></div>`,
      footerTemplate: `<div style="${small} text-align: right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });
    console.log(`printed ${out}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
