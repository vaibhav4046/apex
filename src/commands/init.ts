import * as p from "@clack/prompts";
import kleur from "kleur";
import { writeProfile, readProfile, type Profile } from "../lib/store.js";
import { fetchUserRepos, ghAvailable } from "../lib/github.js";

export async function initCommand() {
  console.clear();
  p.intro(kleur.bgCyan().black(" apex ") + kleur.dim(" autonomous job application engine"));

  const existing = readProfile();
  if (existing) {
    const reuse = await p.confirm({
      message: `Found existing profile for ${existing.fullName}. Update it?`,
      initialValue: true,
    });
    if (p.isCancel(reuse) || !reuse) {
      p.outro("Keeping existing profile. Use `apex apply` to start applying.");
      return;
    }
  }

  const fullName = await text("Full name", existing?.fullName);
  const email = await text("Email", existing?.email);
  const phone = await text("Phone (optional)", existing?.phone, true);
  const location = await text("Current location (city, country)", existing?.location, true);
  const linkedinUrl = await text("LinkedIn URL", existing?.linkedinUrl, true);
  const githubUsername = await text("GitHub username (used for repo analysis)", existing?.githubUsername, true);
  const websiteUrl = await text("Personal site URL (optional)", existing?.websiteUrl, true);

  const yearsExperience = await num("Years of experience", existing?.yearsExperience ?? 0);

  const skillsCsv = await text("Top skills (comma-separated)", existing?.skills.join(", "));
  const skills = skillsCsv.split(",").map((s) => s.trim()).filter(Boolean);

  // Targeting
  const rolesCsv = await text("Target roles (comma-separated, e.g. 'Senior Frontend Engineer, Full-stack Engineer')", existing?.preferences.targetRoles.join(", "));
  const targetRoles = rolesCsv.split(",").map((s) => s.trim()).filter(Boolean);

  const SENIORITY_OPTIONS = [
    { value: "intern", label: "intern" },
    { value: "junior", label: "junior" },
    { value: "mid", label: "mid" },
    { value: "senior", label: "senior" },
    { value: "staff", label: "staff" },
    { value: "lead", label: "lead" },
  ] as const;
  const seniority = (await p.select({
    message: "Target seniority",
    options: SENIORITY_OPTIONS as unknown as { value: Profile["preferences"]["targetSeniority"]; label: string }[],
    initialValue: existing?.preferences.targetSeniority ?? "mid",
  })) as Profile["preferences"]["targetSeniority"];

  const locationsCsv = await text("Target locations (comma-separated, or 'remote')", existing?.preferences.targetLocations.join(", ") ?? "remote");
  const targetLocations = locationsCsv.split(",").map((s) => s.trim()).filter(Boolean);

  const workTypeChoices = (await p.multiselect({
    message: "Work types you'll accept",
    options: [
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
      { value: "onsite", label: "On-site" },
    ],
    initialValues: existing?.preferences.workType ?? ["remote"],
    required: true,
  })) as Profile["preferences"]["workType"];

  const salaryStr = await text("Min salary USD (annual, optional, e.g. 80000)", existing?.preferences.salaryMinUSD?.toString(), true);
  const salaryMinUSD = salaryStr ? Number(salaryStr.replace(/\D/g, "")) || undefined : undefined;

  const visa = (await p.confirm({
    message: "Need visa sponsorship?",
    initialValue: existing?.preferences.visaSponsorship ?? false,
  })) as boolean;

  // Experience entries (loop)
  const experience: Profile["experience"] = existing?.experience ?? [];
  const addMore = experience.length === 0;
  if (addMore) {
    p.note("Add your most recent role(s). Press Esc on the role prompt to skip/finish.", "Experience");
    let keep = true;
    while (keep) {
      const role = await text("Role title (e.g. 'Software Engineer')", "", true);
      if (!role) break;
      const company = await text("Company");
      const period = await text("Period (e.g. 'Jan 2023 — Present')");
      const bulletsTxt = await text("Top achievements (one per line, separate with ';')");
      const bullets = bulletsTxt.split(";").map((s) => s.trim()).filter(Boolean);
      experience.push({ role, company, period, bullets });
      keep = (await p.confirm({ message: "Add another role?", initialValue: false })) as boolean;
    }
  }

  // Education
  const education: Profile["education"] = existing?.education ?? [];
  if (education.length === 0) {
    const eduDegree = await text("Most recent degree (e.g. 'B.S. Computer Science')", "", true);
    if (eduDegree) {
      const eduSchool = await text("School");
      const eduPeriod = await text("Period (e.g. '2020 — 2024')");
      education.push({ degree: eduDegree, school: eduSchool, period: eduPeriod });
    }
  }

  // GitHub repos
  let projects: Profile["projects"] = existing?.projects ?? [];
  if (githubUsername && ghAvailable()) {
    const s = p.spinner();
    s.start(`Fetching top GitHub repos for ${githubUsername}…`);
    const repos = fetchUserRepos(githubUsername, 8);
    s.stop(`Found ${repos.length} repos`);
    if (repos.length > 0) {
      const picked = (await p.multiselect({
        message: "Select projects to feature on resume",
        options: repos.map((r) => ({
          value: r.url,
          label: `${r.name}${r.stars ? ` (${r.stars}★)` : ""} — ${r.description.slice(0, 60) || "no description"}`,
        })),
        initialValues: repos.slice(0, 3).map((r) => r.url),
        required: false,
      })) as string[];
      projects = repos
        .filter((r) => picked.includes(r.url))
        .map((r) => ({ name: r.name, description: r.description, url: r.url }));
    }
  }

  const summary = await text("One-sentence professional summary (optional, AI will generate if blank)", existing?.summary, true);

  const profile: Profile = {
    fullName, email, phone, location, linkedinUrl, githubUsername, websiteUrl,
    yearsExperience, skills, experience, education, projects, summary,
    preferences: { targetRoles, targetSeniority: seniority, targetLocations, workType: workTypeChoices, salaryMinUSD, visaSponsorship: visa },
  };
  writeProfile(profile);

  p.outro([
    kleur.green("Profile saved."),
    "",
    "Next:",
    `  ${kleur.cyan("apex resume")}    Generate tailored 1-page resume PDF`,
    `  ${kleur.cyan("apex cover")}     Generate cover letter for a specific job`,
    `  ${kleur.cyan("apex apply")}     Auto-apply to jobs on LinkedIn / Indeed`,
    "",
  ].join("\n"));
}

async function text(message: string, initial?: string, optional = false) {
  const r = await p.text({ message, initialValue: initial ?? "", validate: (v) => optional || v.length > 0 ? undefined : "Required" });
  if (p.isCancel(r)) process.exit(0);
  return r as string;
}
async function num(message: string, initial = 0) {
  const r = await p.text({
    message,
    initialValue: String(initial),
    validate: (v) => /^\d+$/.test(v) ? undefined : "Enter a number",
  });
  if (p.isCancel(r)) process.exit(0);
  return Number(r);
}
