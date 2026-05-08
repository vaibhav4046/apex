import { execSync } from "node:child_process";

export type GhRepo = { name: string; description: string; language: string; stars: number; url: string };

export function ghAvailable(): boolean {
  try {
    execSync("gh --version", { stdio: "pipe" });
    return true;
  } catch { return false; }
}

export function ghAuthed(): boolean {
  try {
    execSync("gh auth status", { stdio: "pipe" });
    return true;
  } catch { return false; }
}

/** Pull user's top public repos via gh CLI. */
export function fetchUserRepos(username: string, limit = 10): GhRepo[] {
  if (!ghAvailable()) return [];
  try {
    const json = execSync(
      `gh api "users/${username}/repos?per_page=${limit}&sort=updated"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    const repos = JSON.parse(json) as Array<{
      name: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      html_url: string;
      fork: boolean;
    }>;
    return repos
      .filter((r) => !r.fork)
      .slice(0, limit)
      .map((r) => ({
        name: r.name,
        description: r.description ?? "",
        language: r.language ?? "",
        stars: r.stargazers_count,
        url: r.html_url,
      }));
  } catch (e) {
    if (process.env.APEX_DEBUG) console.error("[apex] gh fetch error:", e);
    return [];
  }
}

/** Get readme of top repo for context. */
export function fetchRepoReadme(owner: string, repo: string): string {
  if (!ghAvailable()) return "";
  try {
    const out = execSync(`gh api "repos/${owner}/${repo}/readme" -H "Accept: application/vnd.github.raw"`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return out.slice(0, 3000);
  } catch { return ""; }
}
