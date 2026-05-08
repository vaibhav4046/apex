import * as p from "@clack/prompts";
import kleur from "kleur";
import path from "node:path";
import fs from "node:fs/promises";
import { readProfile, COVER_DIR } from "../lib/store.js";
import { llmGenerate, availableProviders } from "../lib/llm.js";
import { renderCoverPdf } from "../lib/pdf.js";

export async function coverCommand(opts: { jobUrl?: string; jobDescription?: string; company?: string; role?: string; out?: string }) {
  p.intro(kleur.bgCyan().black(" apex cover "));
  const profile = readProfile();
  if (!profile) { p.cancel("Run `apex init` first."); process.exit(1); }
  if (availableProviders().length === 0) { p.cancel("No LLM provider configured."); process.exit(1); }

  let jobDescription = opts.jobDescription || "";
  let company = opts.company || "";
  let role = opts.role || "";

  if (!jobDescription && opts.jobUrl) {
    const s = p.spinner(); s.start("Fetching job description…");
    try {
      const r = await fetch(opts.jobUrl, { headers: { "User-Agent": "apex-cli/0.1" } });
      jobDescription = stripHtml(await r.text()).slice(0, 8000);
      s.stop("Fetched");
    } catch { s.stop("Fetch failed"); }
  }
  if (!company) {
    const c = await p.text({ message: "Company name" });
    if (p.isCancel(c)) process.exit(0);
    company = c as string;
  }
  if (!role) {
    const r = await p.text({ message: "Role title" });
    if (p.isCancel(r)) process.exit(0);
    role = r as string;
  }
  if (!jobDescription) {
    const jd = await p.text({ message: "Paste job description (optional)" });
    if (p.isCancel(jd)) process.exit(0);
    jobDescription = (jd as string) || "";
  }

  const s = p.spinner(); s.start("Drafting cover letter…");
  const md = await generateCoverMarkdown(profile, company, role, jobDescription);
  s.stop("Letter generated");

  const stamp = Date.now();
  const safe = `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const baseName = `${safe}-${stamp}`;
  const mdPath = path.join(COVER_DIR, `${baseName}.md`);
  const pdfPath = opts.out || path.join(COVER_DIR, `${baseName}.pdf`);
  await fs.writeFile(mdPath, md, "utf8");

  const s2 = p.spinner(); s2.start("Rendering PDF…");
  await renderCoverPdf(md, pdfPath);
  s2.stop("PDF written");

  p.outro([
    kleur.green("Cover letter ready."),
    `  Markdown: ${kleur.dim(mdPath)}`,
    `  PDF:      ${kleur.cyan(pdfPath)}`,
  ].join("\n"));
}

async function generateCoverMarkdown(profile: ReturnType<typeof readProfile> & object, company: string, role: string, jd: string): Promise<string> {
  const system = `You write concise, specific cover letters. 3-4 paragraphs. Under 350 words. No clichés ("I'm excited to apply", "as a passionate"). Open with a specific reason this candidate fits this role. Cite 1-2 concrete projects/experiences. Close with a clear call to action. Markdown only — H1 with candidate name, contact line, then body paragraphs.`;
  const prompt = `Candidate profile:
${JSON.stringify(profile, null, 2)}

Target: ${role} at ${company}
${jd ? `Job description:\n${jd}\n` : ""}

Write the cover letter. Output ONLY markdown, no commentary.`;
  const { text } = await llmGenerate(prompt, system);
  return text.trim();
}

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
