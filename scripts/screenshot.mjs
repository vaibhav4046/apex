import puppeteer from "puppeteer";
import { marked } from "marked";
import fs from "node:fs/promises";
import path from "node:path";

const RESUME_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f3f4f6; }
.page {
  width: 8.5in; min-height: 11in;
  background: white;
  margin: 24px auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.12);
  font-family: -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt; line-height: 1.4; color: #111827;
  padding: 0.5in 0.55in; letter-spacing: -0.005em;
}
h1 { font-size: 22pt; margin: 0 0 2px; letter-spacing: -0.025em; }
h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 14px 0 6px; }
h3 { font-size: 10.8pt; margin: 8px 0 1px; font-weight: 600; }
p { margin: 0 0 6px; }
ul { margin: 2px 0 6px; padding-left: 16px; }
li { margin-bottom: 1px; }
strong { color: #111827; }
a { color: #2563eb; text-decoration: none; }
`;

const md = await fs.readFile(process.argv[2], "utf8");
const html = marked.parse(md);
const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${RESUME_CSS}</style></head><body><div class="page">${html}</div></body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 920, height: 1200, deviceScaleFactor: 2 });
await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
const out = process.argv[3] ?? "docs/resume-preview.png";
await fs.mkdir(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("wrote", out);
