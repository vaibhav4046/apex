import * as p from "@clack/prompts";
import kleur from "kleur";
import path from "node:path";
import fs from "node:fs/promises";
import { readProfile, RESUME_DIR, addApp, type Application } from "../lib/store.js";
import { llmGenerate, availableProviders } from "../lib/llm.js";
import { renderResumePdf } from "../lib/pdf.js";
import { openBrowser, ensureLoggedIn } from "../lib/browser.js";
import { searchLinkedin, applyLinkedinJob, type JobListing } from "../lib/jobs.js";

export async function applyCommand(opts: {
  query?: string;
  location?: string;
  limit?: number;
  dryRun?: boolean;
  headless?: boolean;
  platform?: "linkedin" | "indeed";
}) {
  p.intro(kleur.bgCyan().black(" apex apply ") + kleur.dim(" autonomous job applications"));

  const profile = readProfile();
  if (!profile) { p.cancel("Run `apex init` first."); process.exit(1); }
  if (availableProviders().length === 0) { p.cancel("No LLM provider configured."); process.exit(1); }

  const platform = opts.platform ?? "linkedin";
  const query = opts.query ?? profile.preferences.targetRoles[0];
  const location = opts.location ?? profile.preferences.targetLocations[0];
  const limit = opts.limit ?? 10;
  const dryRun = !!opts.dryRun;

  if (!query) { p.cancel("No target role. Provide --query or run `apex init`."); process.exit(1); }

  p.note([
    `Platform: ${kleur.cyan(platform)}`,
    `Query:    ${kleur.cyan(query)}`,
    `Location: ${kleur.cyan(location ?? "any")}`,
    `Limit:    ${kleur.cyan(String(limit))}`,
    `Mode:     ${kleur.cyan(dryRun ? "DRY RUN (no submit)" : "LIVE")}`,
  ].join("\n"), "Run config");

  if (!dryRun) {
    const ok = (await p.confirm({
      message: `Apply to ${limit} jobs autonomously? You can intervene anytime.`,
      initialValue: false,
    })) as boolean;
    if (!ok) { p.outro("Aborted."); return; }
  }

  const { page, close } = await openBrowser({ headless: !!opts.headless });
  try {
    if (platform === "linkedin") {
      const loggedIn = await ensureLoggedIn(page, "linkedin", "https://www.linkedin.com/feed/", "start a post");
      if (!loggedIn) { p.cancel("LinkedIn login required."); return; }
      const s = p.spinner(); s.start("Searching LinkedIn jobs…");
      const jobs = await searchLinkedin(page, { q: query, location, remote: profile.preferences.workType.includes("remote"), pages: Math.ceil(limit / 25) });
      s.stop(`Found ${jobs.length} jobs`);
      const targets = jobs.filter((j) => j.easyApply).slice(0, limit);
      if (targets.length === 0) { p.outro("No Easy Apply jobs matched."); return; }
      await processJobs(page, profile, targets, dryRun);
    } else {
      p.cancel(`Platform ${platform} not yet implemented in this build.`);
    }
  } finally {
    await close();
  }
  p.outro(kleur.green("Done. See `apex history` for run summary."));
}

async function processJobs(page: import("playwright").Page, profile: NonNullable<ReturnType<typeof readProfile>>, jobs: JobListing[], dryRun: boolean) {
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    p.log.step(`(${i + 1}/${jobs.length}) ${kleur.cyan(j.title)} @ ${j.company}`);

    // Generate tailored resume PDF
    const resumeMd = await tailorResume(profile, `${j.title}\n${j.company}\n${j.location}`);
    const stamp = Date.now();
    const safe = `${j.title}-${j.company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const pdfPath = path.join(RESUME_DIR, `${safe}-${stamp}.pdf`);
    await renderResumePdf(resumeMd, pdfPath);
    await fs.writeFile(pdfPath.replace(/\.pdf$/, ".md"), resumeMd, "utf8");

    if (dryRun) {
      p.log.message(kleur.dim("  dry run — skipping submission"));
      addApp({
        id: stamp.toString(36),
        jobUrl: j.url, jobTitle: j.title, company: j.company, platform: "linkedin",
        status: "drafted", resumePath: pdfPath, appliedAt: stamp,
        message: "dry-run",
      });
      continue;
    }

    let result = await applyLinkedinJob(page, j.url, profile, pdfPath, { debug: true });

    // Pause-on-stuck: let user finish in browser, then resume
    if (!result.ok && /Stuck on required/.test(result.message)) {
      p.log.warn(kleur.yellow(`⏸  ${result.message}`));
      const takeover = (await p.confirm({
        message: "Finish this application in the browser, then continue?",
        initialValue: true,
      })) as boolean;
      if (takeover) {
        result = { ok: true, message: "submitted (human takeover)", stepsCompleted: result.stepsCompleted };
      }
    }

    addApp({
      id: stamp.toString(36),
      jobUrl: j.url, jobTitle: j.title, company: j.company, platform: "linkedin",
      status: result.ok ? "submitted" : "error",
      resumePath: pdfPath, appliedAt: stamp,
      message: result.message,
    } as Application);
    p.log.message(`  ${result.ok ? kleur.green("✓ " + result.message) : kleur.yellow("⚠ " + result.message)}`);
    await page.waitForTimeout(2500); // be polite
  }
}

async function tailorResume(profile: NonNullable<ReturnType<typeof readProfile>>, jobBlurb: string): Promise<string> {
  const system = `You write ATS-safe one-page markdown resumes. Tailor to the job title/company hint. Keep under 550 words.`;
  const prompt = `Profile JSON:\n${JSON.stringify(profile, null, 2)}\n\nJob hint:\n${jobBlurb}\n\nOutput markdown only.`;
  const { text } = await llmGenerate(prompt, system);
  return text.trim();
}
