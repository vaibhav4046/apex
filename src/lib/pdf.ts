import puppeteer from "puppeteer";
import { marked } from "marked";
import fs from "node:fs/promises";

const RESUME_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
  color: #111827;
  padding: 0.5in 0.55in;
  letter-spacing: -0.005em;
}
h1 { font-size: 22pt; margin: 0 0 2px; letter-spacing: -0.025em; }
h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 14px 0 6px; }
h3 { font-size: 10.8pt; margin: 8px 0 1px; font-weight: 600; }
p { margin: 0 0 6px; }
ul { margin: 2px 0 6px; padding-left: 16px; }
li { margin-bottom: 1px; }
.contact { font-size: 9.5pt; color: #4b5563; margin-bottom: 4px; }
.contact a { color: #2563eb; text-decoration: none; }
.role-line { display: flex; justify-content: space-between; font-size: 9.8pt; color: #6b7280; }
strong { color: #111827; }
em { color: #6b7280; font-style: normal; }
hr { display: none; }
@page { size: Letter; margin: 0; }
`;

const COVER_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #111827;
  padding: 1in 1in;
}
h1 { font-size: 18pt; margin: 0 0 4px; }
.contact { font-size: 10pt; color: #4b5563; margin-bottom: 28px; }
p { margin: 0 0 12px; }
@page { size: Letter; margin: 0; }
`;

export async function renderResumePdf(markdown: string, outPath: string) {
  const html = marked.parse(markdown) as string;
  await renderPdf(html, RESUME_CSS, outPath);
}
export async function renderCoverPdf(markdown: string, outPath: string) {
  const html = marked.parse(markdown) as string;
  await renderPdf(html, COVER_CSS, outPath);
}

async function renderPdf(htmlBody: string, css: string, outPath: string) {
  const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${htmlBody}</body></html>`;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({ format: "Letter", printBackground: true });
    await fs.writeFile(outPath, pdf);
  } finally {
    await browser.close();
  }
}
