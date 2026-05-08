// Capture real screenshots: (1) LinkedIn public jobs search page that apex drives,
// (2) actual apex CLI stdout rendered via ansi-to-html.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

await fs.mkdir("docs", { recursive: true });

// 1. LinkedIn jobs page screenshot (public, no auth needed for search redirect)
console.log("→ launching chromium for LinkedIn screenshot");
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.linkedin.com/jobs/search?keywords=Senior%20Frontend%20Engineer&f_AL=true", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
await page.screenshot({ path: "docs/linkedin-search.png", fullPage: false });
console.log("✓ docs/linkedin-search.png");
await browser.close();

// 2. Run real `apex resume` and render its ANSI stdout as PNG
console.log("→ capturing real apex resume stdout");
const r = spawnSync("node", ["dist/index.js", "resume", "--job-url", "https://www.linkedin.com/jobs/view/4103298765"], { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "1" } });
const raw = (r.stdout || "") + (r.stderr || "");

// strip cursor/spinner control sequences. Spinner re-uses same line via \x1b[NNND \x1b[J,
// so split on those and only keep the LAST frame of each spinner block.
const stripped = raw
  .replace(/\x1b\[\?25[hl]/g, "")
  .replace(/\r/g, "");

// each spinner update = "<999D><J><frame>"; keep last frame only
const SPINNER_RESET = /\x1b\[\d+D\x1b\[J/g;
const parts = stripped.split(SPINNER_RESET);
// reassemble: each part except the first is a spinner frame; keep only last frame in a run
let cleaned = parts[0];
for (let i = 1; i < parts.length; i++) {
  // peek ahead: if next part also looks like a spinner frame for same task, skip
  const next = parts[i + 1];
  const cur = parts[i];
  const isSpinFrame = /^[◒◐◓◑◒◐◓◑]/.test(cur.trimStart().replace(/\x1b\[\d+m/g, ""));
  if (isSpinFrame && next && /^[◒◐◓◑◒◐◓◑]/.test(next.trimStart().replace(/\x1b\[\d+m/g, ""))) continue;
  cleaned += "\n" + cur;
}
cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

// minimal ANSI → HTML
const ANSI = {
  "30": "#000", "31": "#ef4444", "32": "#22c55e", "33": "#eab308",
  "34": "#3b82f6", "35": "#a855f7", "36": "#06b6d4", "37": "#e5e7eb",
  "90": "#6b7280", "91": "#f87171", "92": "#4ade80", "93": "#facc15",
  "94": "#60a5fa", "95": "#c084fc", "96": "#22d3ee", "97": "#fff",
};
let html = "";
let open = false;
const re = /\x1b\[(\d+(?:;\d+)*)m/g;
let last = 0; let m;
while ((m = re.exec(cleaned)) !== null) {
  html += escapeHtml(cleaned.slice(last, m.index));
  const codes = m[1].split(";");
  if (codes.includes("0") || m[1] === "") {
    if (open) { html += "</span>"; open = false; }
  } else {
    const color = codes.find((c) => ANSI[c]);
    if (color) {
      if (open) html += "</span>";
      html += `<span style="color:${ANSI[color]}">`;
      open = true;
    }
  }
  last = re.lastIndex;
}
html += escapeHtml(cleaned.slice(last));
if (open) html += "</span>";
function escapeHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

const wrapper = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; padding: 36px; background: #0a0a0a; font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; }
.term { width: 880px; background: #0f0f0f; border-radius: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.55); overflow: hidden; }
.bar { height: 32px; background: #1a1a1a; display: flex; align-items: center; padding: 0 14px; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
.title { color:#888; font-size:12px; margin-left:14px; }
pre { margin:0; padding:24px 28px; color:#e5e7eb; font-size:13.5px; line-height:1.7; white-space:pre-wrap; }
</style></head><body>
<div class="term">
  <div class="bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="title">apex resume — real stdout capture</div></div>
  <pre>${html.trim()}</pre>
</div></body></html>`;

const b2 = await chromium.launch({ headless: true });
const p2 = await (await b2.newContext()).newPage();
await p2.setViewportSize({ width: 960, height: 800 });
await p2.setContent(wrapper);
await p2.screenshot({ path: "docs/cli-real.png", fullPage: true });
await b2.close();
console.log("✓ docs/cli-real.png");
