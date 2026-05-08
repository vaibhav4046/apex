import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const APEX_DIR = process.env.APEX_DATA_DIR || path.join(os.homedir(), ".apex");
fs.mkdirSync(APEX_DIR, { recursive: true });

export type Profile = {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUsername?: string;
  websiteUrl?: string;
  yearsExperience: number;
  skills: string[];
  experience: { role: string; company: string; period: string; bullets: string[] }[];
  education: { degree: string; school: string; period: string }[];
  projects?: { name: string; description: string; url?: string }[];
  summary?: string;
  preferences: {
    targetRoles: string[];
    targetSeniority: "intern" | "junior" | "mid" | "senior" | "staff" | "lead";
    targetLocations: string[];
    workType: ("remote" | "hybrid" | "onsite")[];
    salaryMinUSD?: number;
    visaSponsorship?: boolean;
  };
  /** Free-text answers to clarifying questions */
  notes?: string;
};

export function profilePath() { return path.join(APEX_DIR, "profile.json"); }
export function readProfile(): Profile | null {
  try { return JSON.parse(fs.readFileSync(profilePath(), "utf8")); } catch { return null; }
}
export function writeProfile(p: Profile) {
  fs.writeFileSync(profilePath(), JSON.stringify(p, null, 2), "utf8");
}

export type Application = {
  id: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
  platform: "linkedin" | "indeed" | "wellfound" | "other";
  status: "drafted" | "submitted" | "skipped" | "error";
  resumePath?: string;
  coverLetterPath?: string;
  message?: string;
  appliedAt: number;
};

export function appsPath() { return path.join(APEX_DIR, "applications.json"); }
export function readApps(): Application[] {
  try { return JSON.parse(fs.readFileSync(appsPath(), "utf8")); } catch { return []; }
}
export function writeApps(apps: Application[]) {
  fs.writeFileSync(appsPath(), JSON.stringify(apps, null, 2), "utf8");
}
export function addApp(a: Application) {
  const all = readApps();
  all.push(a);
  writeApps(all);
}

export const RESUME_DIR = path.join(APEX_DIR, "resumes");
export const COVER_DIR = path.join(APEX_DIR, "covers");
fs.mkdirSync(RESUME_DIR, { recursive: true });
fs.mkdirSync(COVER_DIR, { recursive: true });
