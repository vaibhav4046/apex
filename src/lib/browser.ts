import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import { APEX_DIR } from "./store.js";

const STATE_DIR = path.join(APEX_DIR, "browser-state");

export async function openBrowser({ headless = false }: { headless?: boolean } = {}): Promise<{ ctx: BrowserContext; page: Page; close: () => Promise<void> }> {
  const ctx = await chromium.launchPersistentContext(STATE_DIR, {
    headless,
    viewport: { width: 1366, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = ctx.pages()[0] ?? await ctx.newPage();
  return {
    ctx, page,
    close: async () => { await ctx.close(); },
  };
}

export async function ensureLoggedIn(page: Page, host: string, loginUrl: string, signal: string): Promise<boolean> {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const text = (await page.content()).toLowerCase();
  if (text.includes(signal.toLowerCase())) return true;
  // Wait up to 5 minutes for user to login manually
  console.log(`Waiting for you to log into ${host}… (max 5 min)`);
  try {
    await page.waitForFunction(
      (sig) => document.body && document.body.innerText.toLowerCase().includes(sig.toLowerCase()),
      signal,
      { timeout: 300_000 },
    );
    return true;
  } catch { return false; }
}
