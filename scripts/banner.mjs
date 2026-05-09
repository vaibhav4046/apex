// Polished hero banner for LinkedIn Featured / GitHub social card.
// 1920x1005 — LinkedIn featured optimal; also good for GitHub social preview.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1920px; height: 1005px;
  background: radial-gradient(ellipse at top right, #1e293b 0%, #0a0a0a 60%);
  font-family: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  color: white; overflow: hidden; position: relative;
}
.grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 60% 50% at 70% 40%, black 40%, transparent 80%);
}
.glow {
  position: absolute; top: -200px; right: -100px;
  width: 700px; height: 700px;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  opacity: 0.4; filter: blur(80px);
}
.container {
  position: relative; z-index: 10;
  padding: 96px 120px;
  display: flex; align-items: center; height: 100%;
  gap: 80px;
}
.left { flex: 1; }
.brand { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
.logo {
  width: 64px; height: 64px;
  background: linear-gradient(135deg, #06b6d4, #6366f1);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 36px; letter-spacing: -0.04em;
  box-shadow: 0 8px 32px rgba(6,182,212,0.5);
}
.brand-name { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.brand-tag { font-size: 14px; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
h1 {
  font-size: 84px; font-weight: 800; letter-spacing: -0.04em;
  line-height: 1.05; margin-bottom: 28px;
  background: linear-gradient(90deg, #fff 0%, #cbd5e1 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
h1 .accent {
  background: linear-gradient(90deg, #22d3ee 0%, #818cf8 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { font-size: 26px; color: #94a3b8; line-height: 1.45; margin-bottom: 44px; max-width: 720px; font-weight: 400; }
.subtitle b { color: #e5e7eb; font-weight: 600; }
.features { display: flex; gap: 14px; margin-bottom: 48px; flex-wrap: wrap; }
.chip {
  padding: 10px 18px; border: 1px solid rgba(34,211,238,0.3);
  border-radius: 999px; font-size: 15px; color: #cbd5e1;
  background: rgba(34,211,238,0.06); font-weight: 500;
}
.cta {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 18px 32px; border-radius: 12px; font-size: 18px; font-weight: 600;
  background: linear-gradient(90deg, #06b6d4, #6366f1);
  color: white; text-decoration: none;
  box-shadow: 0 12px 32px rgba(6,182,212,0.35);
}
.right {
  flex: 0 0 640px; position: relative;
}
.term {
  background: #0f0f0f; border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
  overflow: hidden;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  transform: rotate(-2deg);
}
.term-bar { height: 36px; background: #1a1a1a; display: flex; align-items: center; padding: 0 16px; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
.term-title { color:#666; font-size: 12px; margin-left: 14px; }
.term-body { padding: 28px 30px; font-size: 14px; line-height: 1.85; color: #e5e7eb; }
.cy{color:#22d3ee}.gn{color:#4ade80}.dm{color:#6b7280}.pp{color:#c084fc}.yl{color:#facc15}
</style></head><body>
<div class="grid"></div>
<div class="glow"></div>
<div class="container">
  <div class="left">
    <div class="brand">
      <div class="logo">a</div>
      <div>
        <div class="brand-name">apex</div>
        <div class="brand-tag">autonomous job application engine</div>
      </div>
    </div>
    <h1>Apply to <span class="accent">100s of jobs</span><br>while you sleep.</h1>
    <p class="subtitle">Open Chrome. Find Easy Apply roles. Tailor a <b>1-page resume per job</b>. Answer custom questions with an LLM. Submit until LinkedIn's daily cap. <b>Free LLMs only.</b></p>
    <div class="features">
      <div class="chip">⚡ LLM-driven form filler</div>
      <div class="chip">🆓 Groq · Cerebras · Gemini · Ollama</div>
      <div class="chip">📄 ATS-safe PDFs</div>
      <div class="chip">🔁 Run-until-cap</div>
    </div>
    <div class="cta">github.com/vaibhav4046/apex →</div>
  </div>
  <div class="right">
    <div class="term">
      <div class="term-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="term-title">~/projects/apex — apex apply --all</div></div>
      <div class="term-body"><span class="dm">$</span> apex apply <span class="cy">--all</span>

<span class="gn">◇</span> <span class="dm">Found 142 Easy Apply jobs</span>
<span class="gn">◆</span> <span class="cy">Senior Frontend</span> @ Vercel
   <span class="dm">→ tailoring resume</span>
   <span class="pp">[step 0]</span> 4 fields filled
   <span class="pp">[step 1]</span> 2 fields filled
   <span class="gn">✓ submitted</span>
<span class="gn">◆</span> <span class="cy">Staff React Engineer</span> @ Linear
   <span class="gn">✓ submitted</span> <span class="dm">(cache 5/8)</span>
<span class="gn">◆</span> <span class="cy">Lead Frontend</span> @ Stripe
   <span class="gn">✓ submitted</span>
<span class="dm">...</span> <span class="gn">87 more</span>
<span class="yl">🛑 LinkedIn cap hit.</span>
   <span class="dm">Submitted 90 today.</span></div>
    </div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1005 });
await page.setContent(html, { waitUntil: "domcontentloaded" });
await fs.mkdir("docs", { recursive: true });
await page.screenshot({ path: "docs/banner.png" });

// Also smaller variant for LinkedIn featured (1200x627)
await page.setViewportSize({ width: 1200, height: 627 });
await page.screenshot({ path: "docs/banner-li.png" });

await browser.close();
console.log("✓ docs/banner.png (1920x1005)");
console.log("✓ docs/banner-li.png (1200x627)");
