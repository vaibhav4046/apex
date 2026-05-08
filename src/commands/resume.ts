import * as p from "@clack/prompts";
import kleur from "kleur";
import path from "node:path";
import fs from "node:fs/promises";
import { readProfile, RESUME_DIR } from "../lib/store.js";
import { llmGenerate, availableProviders } from "../lib/llm.js";
import { renderResumePdf } from "../lib/pdf.js";

export async function resumeCommand(opts: { jobUrl?: string; jobDescription?: string; out?: string }) {
  p.intro(kleur.bgCyan().black(" apex resume "));

  const profile = readProfile();
  if (!profile) {
    p.cancel("No profile found. Run `apex init` first.");
    process.exit(1);
  }
  if (availableProviders().length === 0) {
    p.cancel("No LLM provider. Set GROQ_API_KEY / CEREBRAS_API_KEY / GEMINI_API_KEY or run Ollama (OLLAMA_ENABLED=1).");
    process.exit(1);
  }

  let jobDescription = opts.jobDescription || "";
  if (!jobDescription && opts.jobUrl) {
    const s = p.spinner(); s.start("Fetching job description from URL…");
    try {
      const r = await fetch(opts.jobUrl, { headers: { "User-Agent": "apex-cli/0.1" } });
      const html = await r.text();
      jobDescription = stripHtml(html).slice(0, 8000);
      s.stop("Job description fetched");
    } catch (e) {
      s.stop("Failed to fetch URL — paste manually");
    }
  }
  if (!jobDescription) {
    const r = await p.text({
      message: "Paste job description (optional, leave blank for generic resume)",
      placeholder: "Skip with Enter for generic version",
    });
    if (p.isCancel(r)) process.exit(0);
    jobDescription = (r as string) || "";
  }

  const s = p.spinner(); s.start(jobDescription ? "Generating tailored resume…" : "Generating generic resume…");
  const md = await generateResumeMarkdown(profile, jobDescription);
  s.stop("Resume generated");

  const stamp = Date.now();
  const safeRole = (profile.preferences.targetRoles[0] || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const baseName = `${safeRole}-${stamp}`;
  const mdPath = path.join(RESUME_DIR, `${baseName}.md`);
  const pdfPath = opts.out || path.join(RESUME_DIR, `${baseName}.pdf`);
  await fs.writeFile(mdPath, md, "utf8");

  const s2 = p.spinner(); s2.start("Rendering PDF…");
  await renderResumePdf(md, pdfPath);
  s2.stop("PDF written");

  p.outro([
    kleur.green("Resume ready."),
    `  Markdown: ${kleur.dim(mdPath)}`,
    `  PDF:      ${kleur.cyan(pdfPath)}`,
  ].join("\n"));
}

async function generateResumeMarkdown(profile: ReturnType<typeof readProfile> & object, jobDescription: string): Promise<string> {
  const profileBlock = JSON.stringify(profile, null, 2);

  const system = `You are a senior tech recruiter and resume writer. Output ONE-PAGE resumes in clean markdown. Rules:
- ATS-safe markdown only (no tables, no emoji)
- Quantify impact in bullets (numbers, %, scale)
- Keep total length 1 page (~ 450-550 words)
- Use action verbs (Built, Shipped, Led, Designed, Reduced, Scaled)
- Top section: name as H1, contact line, then 1-2 line summary
- Sections: Experience · Projects · Skills · Education
- Tailor to the job description if provided — emphasize matching skills/experience first
- No fluff. No "results-oriented" language. Specific verbs only.`;

  const prompt = `Generate a one-page markdown resume for this candidate.

CANDIDATE PROFILE (JSON):
${profileBlock}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}\n\nTailor the resume to maximize match with this role. Reorder/rephrase bullets to emphasize relevant experience.` : "Generate a strong generic resume."}

Output ONLY the markdown, nothing else.`;

  const { text } = await llmGenerate(prompt, system);
  return text.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
