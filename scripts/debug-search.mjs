// Debug LinkedIn search: open logged-in Chrome, navigate to easy-apply search,
// screenshot + dump first job card HTML so we can fix selectors.
import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

const STATE_DIR = path.join(os.homedir(), ".apex", "browser-state");
const ctx = await chromium.launchPersistentContext(STATE_DIR, {
  headless: false, channel: "chrome", viewport: { width: 1366, height: 900 },
});
const page = ctx.pages()[0] ?? await ctx.newPage();
const params = new URLSearchParams({ keywords: "Frontend Engineer", location: "Remote", f_AL: "true" });
await page.goto(`https://www.linkedin.com/jobs/search/?${params}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

await fs.mkdir("docs", { recursive: true });
await page.screenshot({ path: "docs/debug-search.png", fullPage: false });

const html = await page.evaluate(() => {
  const candidates = [
    "li[data-occludable-job-id]", "div.job-card-container", "li.jobs-search-results__list-item",
    "div.job-card-job-posting-card-wrapper", "[data-job-id]", "ul.scaffold-layout__list-container li",
    "ul.jobs-search-results__list li", ".scaffold-layout__list li",
  ];
  const counts = {};
  for (const sel of candidates) counts[sel] = document.querySelectorAll(sel).length;
  // Find any link to /jobs/view/
  const links = [...document.querySelectorAll('a[href*="/jobs/view/"]')].slice(0, 3).map((a) => a.outerHTML.slice(0, 400));
  return { counts, sampleLinks: links, url: location.href };
});
console.log(JSON.stringify(html, null, 2));
await ctx.close();
