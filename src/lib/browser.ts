import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import { APEX_DIR } from "./store.js";

const STATE_DIR = path.join(APEX_DIR, "browser-state");

export async function openBrowser({ headless = false }: { headless?: boolean } = {}): Promise<{ ctx: BrowserContext; page: Page; close: () => Promise<void> }> {
  const ctx = await chromium.launchPersistentContext(STATE_DIR, {
    headless,
    channel: "chrome", // use installed Google Chrome, not bundled Chromium
    viewport: { width: 1366, height: 900 },
  });
  const page = ctx.pages()[0] ?? await ctx.newPage();
  return {
    ctx, page,
    close: async () => { await ctx.close(); },
  };
}

export async function ensureLoggedIn(page: Page, host: string, loginUrl: string, signal: string): Promise<boolean> {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (await isLoggedIn(page, signal)) return true;
  console.log(`\n⏳ Log into ${host} in the Chrome window that just opened.`);
  console.log(`   Once on your feed, apex auto-resumes. (max 10 min)\n`);
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    if (await isLoggedIn(page, signal)) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function isLoggedIn(page: Page, signal: string): Promise<boolean> {
  try {
    const html = (await page.content()).toLowerCase();
    // Public/logged-out pages have these markers — explicit reject
    if (/sign in to linkedin|join now|new to linkedin\?|"public_jobs/.test(html)) return false;
    if (html.includes("global-nav__me") || html.includes("data-test-global-nav__me")) return true;
    if (html.includes(signal.toLowerCase())) return true;
    return false;
  } catch { return false; }
}
