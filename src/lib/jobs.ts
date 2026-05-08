import type { Page } from "playwright";

export type JobListing = {
  platform: "linkedin" | "indeed" | "wellfound";
  title: string;
  company: string;
  location: string;
  url: string;
  easyApply: boolean;
  description?: string;
};

const JOB_CARD_LI = "div.job-card-container, li.jobs-search-results__list-item";

export async function searchLinkedin(page: Page, opts: { q: string; location?: string; remote?: boolean; pages?: number }): Promise<JobListing[]> {
  const params = new URLSearchParams({
    keywords: opts.q,
    location: opts.location ?? "",
    f_AL: "true", // easy apply only
  });
  if (opts.remote) params.set("f_WT", "2");
  await page.goto(`https://www.linkedin.com/jobs/search/?${params.toString()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const collected: JobListing[] = [];
  const totalPages = Math.max(1, opts.pages ?? 1);
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    await page.waitForSelector(JOB_CARD_LI, { timeout: 15_000 }).catch(() => {});
    const items = await page.$$eval(JOB_CARD_LI, (cards) =>
      cards.map((c) => {
        const a = c.querySelector("a.job-card-list__title, a.job-card-container__link") as HTMLAnchorElement | null;
        const titleEl = c.querySelector(".job-card-list__title strong, .job-card-list__title, .job-card-container__link") as HTMLElement | null;
        const companyEl = c.querySelector(".job-card-container__primary-description, .job-card-container__company-name") as HTMLElement | null;
        const locEl = c.querySelector(".job-card-container__metadata-item") as HTMLElement | null;
        const easy = !!c.querySelector(".job-card-container__easy-apply, .job-card-container__apply-method");
        return {
          url: a?.href ?? "",
          title: (titleEl?.innerText || a?.innerText || "").trim(),
          company: (companyEl?.innerText || "").trim(),
          location: (locEl?.innerText || "").trim(),
          easyApply: easy,
        };
      }),
    );
    for (const j of items) {
      if (j.url) collected.push({ platform: "linkedin", ...j });
    }
    if (pageIdx < totalPages - 1) {
      // Click "Next" pagination
      const nextBtn = await page.$('button[aria-label="View next page"]');
      if (!nextBtn) break;
      await nextBtn.click();
      await page.waitForTimeout(2500);
    }
  }
  // dedupe
  const seen = new Set<string>();
  return collected.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

/** Apply to a single LinkedIn Easy Apply job. Best-effort: fills text fields, clicks Submit, snapshots state. */
export async function applyLinkedinJob(page: Page, jobUrl: string, profile: { fullName: string; email: string; phone?: string; resumePath?: string }): Promise<{ ok: boolean; message: string }> {
  await page.goto(jobUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const easyBtn = await page.$('button.jobs-apply-button, button[aria-label*="Easy Apply"]');
  if (!easyBtn) return { ok: false, message: "No Easy Apply button found" };
  await easyBtn.click();
  await page.waitForTimeout(1500);

  // Fill multiple steps until Review/Submit appears
  const MAX_STEPS = 6;
  for (let i = 0; i < MAX_STEPS; i++) {
    await page.waitForTimeout(800);

    // Phone
    if (profile.phone) {
      const phoneInput = await page.$('input[id*="phoneNumber"], input[id*="phone"]');
      if (phoneInput) {
        const cur = await phoneInput.inputValue();
        if (!cur) await phoneInput.fill(profile.phone);
      }
    }

    // Resume upload
    if (profile.resumePath) {
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        try { await fileInput.setInputFiles(profile.resumePath); } catch { /* maybe hidden */ }
      }
    }

    // Click Next / Review / Submit
    const reviewBtn = await page.$('button[aria-label*="Review"]');
    const submitBtn = await page.$('button[aria-label*="Submit application"]');
    const nextBtn = await page.$('button[aria-label*="Continue to next step"], button[aria-label*="Next"]');

    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      return { ok: true, message: "Submitted" };
    }
    if (reviewBtn) { await reviewBtn.click(); continue; }
    if (nextBtn) { await nextBtn.click(); continue; }
    break;
  }
  return { ok: false, message: "Could not complete multi-step form (likely needs custom answers)" };
}

export async function searchIndeed(page: Page, opts: { q: string; location?: string; remote?: boolean }): Promise<JobListing[]> {
  const params = new URLSearchParams({
    q: opts.q,
    l: opts.location ?? "Remote",
    sc: "0kf:attr(DSQF7);",
  });
  await page.goto(`https://www.indeed.com/jobs?${params.toString()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const items = await page.$$eval('a.tapItem, a.jcs-JobTitle, [data-testid="job-title"]', (cards) =>
    cards.map((c) => ({
      url: (c as HTMLAnchorElement).href,
      title: (c as HTMLElement).innerText.trim(),
      company: "",
      location: "",
      easyApply: false,
    })),
  );
  return items.filter((j) => j.url).map((j) => ({ platform: "indeed" as const, ...j }));
}
