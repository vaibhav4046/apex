import puppeteer from "puppeteer";
import fs from "node:fs/promises";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; }
body { margin: 0; padding: 40px; background: #0a0a0a; font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; }
.term { width: 880px; background: #111; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); overflow: hidden; }
.bar { height: 32px; background: #1a1a1a; display: flex; align-items: center; padding: 0 14px; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.r { background: #ff5f56; } .dot.y { background: #ffbd2e; } .dot.g { background: #27c93f; }
.title { color: #888; font-size: 12px; margin-left: 12px; }
pre { margin: 0; padding: 24px 28px; color: #e5e7eb; font-size: 13.5px; line-height: 1.7; white-space: pre-wrap; }
.cyan { color: #22d3ee; } .green { color: #4ade80; } .yellow { color: #facc15; } .dim { color: #6b7280; }
.bgcyan { background: #0891b2; color: #000; padding: 1px 6px; border-radius: 3px; }
.purple { color: #c084fc; }
</style></head><body>
<div class="term">
<div class="bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="title">~/projects/apex — apex apply</div></div>
<pre><span class="dim">$</span> apex apply <span class="cyan">-q</span> "Senior Frontend Engineer" <span class="cyan">-n</span> 5

<span class="bgcyan"> apex apply </span> <span class="dim">autonomous job applications</span>

<span class="dim">┌</span> Run config
<span class="dim">│</span>  Platform: <span class="cyan">linkedin</span>
<span class="dim">│</span>  Query:    <span class="cyan">Senior Frontend Engineer</span>
<span class="dim">│</span>  Location: <span class="cyan">Remote</span>
<span class="dim">│</span>  Limit:    <span class="cyan">5</span>
<span class="dim">│</span>  Mode:     <span class="cyan">LIVE</span>
<span class="dim">└</span>

<span class="green">◇</span>  Searching LinkedIn jobs… found <span class="cyan">37 jobs</span>
<span class="green">◆</span>  (1/5) <span class="cyan">Senior Frontend Engineer</span> @ Vercel
   <span class="dim">tailoring resume → PDF rendered</span>
   <span class="purple">[step 0]</span> 4 fields
     ✓ [text] Phone country code → United States (+1)
     ✓ [text] Mobile phone number → +1-555-0123
     ✓ [select] Years of React experience → 4
     ✓ [radio] Authorized to work in US? → Yes
   <span class="purple">[step 1]</span> 2 fields
     ✓ [textarea] Why Vercel? → I'm drawn to Vercel's edge-first…
     ✓ [checkbox] I agree to terms → yes
   <span class="green">✓ submitted</span>

<span class="green">◆</span>  (2/5) <span class="cyan">Staff Frontend Engineer</span> @ Linear
   <span class="purple">[step 0]</span> 6 fields
     ✓ [text] First name → Vaibhav
     ✓ [text] Last name → Lalwani
     ✓ [text] Email → mondayc852@gmail.com
     ✓ [select] Visa sponsorship needed? → No
     <span class="yellow">⚠ Stuck on required field: "Salary expectations (CAD)"</span>
   <span class="yellow">⏸  pause for human takeover</span>
   <span class="green">✓ submitted (human takeover)</span>

<span class="green">◆</span>  (3/5) <span class="cyan">Senior React Engineer</span> @ Stripe
   <span class="green">✓ submitted</span>  <span class="dim">(cache hit on 5/8 fields)</span>

<span class="dim">└</span>  Done. See <span class="cyan">apex history</span> for run summary.</pre>
</div>
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 1080, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "domcontentloaded" });
await fs.mkdir("docs", { recursive: true });
await page.screenshot({ path: "docs/cli-demo.png", fullPage: true });
await browser.close();
console.log("wrote docs/cli-demo.png");
