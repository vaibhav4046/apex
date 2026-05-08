import type { Page, ElementHandle } from "playwright";
import type { Profile } from "./store.js";
import { llmGenerate } from "./llm.js";
import { getCached, setCached } from "./answer-cache.js";

export type FieldKind = "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "unknown";
export type Field = {
  el: ElementHandle;
  kind: FieldKind;
  label: string;
  options?: string[];        // for select / radio
  /** unique key in case label collides */
  domId?: string;
  required?: boolean;
};

/** Discover all fillable fields in current LinkedIn Easy Apply step. */
export async function discoverFields(page: Page): Promise<Field[]> {
  const fields: Field[] = [];

  // LinkedIn wraps each Q in a `.jobs-easy-apply-form-section__grouping`
  const groups = await page.$$(".jobs-easy-apply-form-section__grouping, .fb-dash-form-element, .jobs-easy-apply-form-element");

  for (const g of groups) {
    const labelEl = await g.$("label, legend, .fb-dash-form-element__label, .jobs-easy-apply-form-section__grouping-label");
    const label = (await labelEl?.innerText())?.trim().replace(/\s+/g, " ") || "";
    if (!label) continue;

    const required = /\*$/.test(label) || (await labelEl?.getAttribute("aria-required")) === "true";

    // 1. text input
    const textInput = await g.$('input[type="text"]:not([role="combobox"]), input[type="email"], input[type="tel"], input[type="number"], input:not([type])');
    if (textInput) {
      fields.push({ el: textInput, kind: "text", label, required, domId: (await textInput.getAttribute("id")) ?? undefined });
      continue;
    }

    // 2. textarea
    const textarea = await g.$("textarea");
    if (textarea) {
      fields.push({ el: textarea, kind: "textarea", label, required, domId: (await textarea.getAttribute("id")) ?? undefined });
      continue;
    }

    // 3. select / typeahead combobox
    const select = await g.$('select, [role="combobox"]');
    if (select) {
      let options: string[] = [];
      const tag = await select.evaluate((n) => n.tagName.toLowerCase());
      if (tag === "select") {
        options = await select.$$eval("option", (opts) =>
          (opts as HTMLOptionElement[])
            .map((o) => o.textContent?.trim() || "")
            .filter((t) => t && t.toLowerCase() !== "select an option" && t.toLowerCase() !== "please choose"),
        );
      }
      fields.push({ el: select, kind: "select", label, options, required, domId: (await select.getAttribute("id")) ?? undefined });
      continue;
    }

    // 4. radio group
    const radios = await g.$$('input[type="radio"]');
    if (radios.length > 0) {
      const options: string[] = [];
      for (const r of radios) {
        const id = await r.getAttribute("id");
        const lbl = id ? await page.$(`label[for="${id}"]`) : null;
        const text = (await lbl?.innerText())?.trim() || "";
        if (text) options.push(text);
      }
      fields.push({ el: radios[0]!, kind: "radio", label, options, required });
      continue;
    }

    // 5. checkbox
    const checkbox = await g.$('input[type="checkbox"]');
    if (checkbox) {
      fields.push({ el: checkbox, kind: "checkbox", label, required });
      continue;
    }

    // 6. file input
    const fileInput = await g.$('input[type="file"]');
    if (fileInput) {
      fields.push({ el: fileInput, kind: "file", label, required });
      continue;
    }
  }

  return fields;
}

/** Decide answer for a single field using profile + LLM (with cache). */
export async function answerField(field: Field, profile: Profile): Promise<string | null> {
  // Direct profile mappings (skip LLM)
  const labelLower = field.label.toLowerCase();
  if (/(first|given) name/.test(labelLower)) return profile.fullName.split(" ")[0] || profile.fullName;
  if (/(last|family|sur)\s*name/.test(labelLower)) return profile.fullName.split(" ").slice(-1)[0] || profile.fullName;
  if (/full name/.test(labelLower) || labelLower === "name") return profile.fullName;
  if (/email/.test(labelLower)) return profile.email;
  if (/phone|mobile|whatsapp|tel/.test(labelLower)) return profile.phone || "";
  if (/(years|yrs).*experience|experience.*(years|yrs)/.test(labelLower)) return String(profile.yearsExperience);
  if (/linkedin/.test(labelLower) && /url|profile/.test(labelLower)) return profile.linkedinUrl || "";
  if (/(github|portfolio|website)/.test(labelLower)) return profile.websiteUrl || profile.linkedinUrl || "";
  if (/(city|location|where.*based|current.*location)/.test(labelLower)) return profile.location || "";
  if (/salary|compensation|expected.*pay/.test(labelLower) && profile.preferences.salaryMinUSD) {
    return String(profile.preferences.salaryMinUSD);
  }

  // Cache lookup
  const cached = getCached(field.label);
  if (cached) return cached;

  // LLM decision
  const answer = await llmAnswer(field, profile);
  if (answer) setCached(field.label, answer);
  return answer;
}

async function llmAnswer(field: Field, profile: Profile): Promise<string | null> {
  let constraints = "";
  if (field.kind === "select" || field.kind === "radio") {
    constraints = `\n\nValid options (pick EXACTLY ONE, copy text verbatim):\n${(field.options || []).map((o) => `- ${o}`).join("\n")}`;
  } else if (field.kind === "checkbox") {
    constraints = `\n\nReturn 'yes' to check the box or 'no' to leave unchecked.`;
  } else if (field.kind === "text" || field.kind === "textarea") {
    constraints = field.kind === "textarea" ? "\n\nKeep answer under 80 words. Plain text only." : "\n\nKeep answer under 12 words. Plain text only.";
  }

  const system = `You answer job application questions truthfully on behalf of a candidate. Be concise. Return ONLY the answer text, no preamble. If a yes/no question is asked and the truthful answer is unclear, prefer the answer that increases the candidate's chances without lying. Numbers as digits.`;
  const prompt = `Candidate profile:
${JSON.stringify(profile, null, 2)}

Question: ${field.label}${constraints}

Answer:`;

  try {
    const { text } = await llmGenerate(prompt, system);
    return text.trim().replace(/^["'`]|["'`]$/g, "").trim();
  } catch {
    return null;
  }
}

/** Apply the resolved answer to the DOM element. */
export async function fillField(page: Page, field: Field, answer: string): Promise<boolean> {
  switch (field.kind) {
    case "text":
    case "textarea": {
      try {
        await field.el.fill(answer);
        return true;
      } catch { return false; }
    }
    case "select": {
      const tag = await field.el.evaluate((n) => (n as Element).tagName.toLowerCase());
      if (tag === "select") {
        try {
          await field.el.selectOption({ label: answer });
          return true;
        } catch {
          // try value match
          try { await field.el.selectOption(answer); return true; } catch { return false; }
        }
      }
      // typeahead: click + type + enter
      try {
        await field.el.click();
        await page.keyboard.type(answer, { delay: 30 });
        await page.waitForTimeout(400);
        await page.keyboard.press("Enter");
        return true;
      } catch { return false; }
    }
    case "radio": {
      // click the radio whose label matches answer
      const id = await field.el.getAttribute("name");
      if (!id) return false;
      const radios = await page.$$(`input[type="radio"][name="${id}"]`);
      for (const r of radios) {
        const rid = await r.getAttribute("id");
        const lbl = rid ? await page.$(`label[for="${rid}"]`) : null;
        const text = (await lbl?.innerText())?.trim();
        if (text && text.toLowerCase() === answer.toLowerCase()) {
          try { await r.check(); return true; } catch { return false; }
        }
      }
      // fuzzy match
      for (const r of radios) {
        const rid = await r.getAttribute("id");
        const lbl = rid ? await page.$(`label[for="${rid}"]`) : null;
        const text = ((await lbl?.innerText())?.trim() ?? "").toLowerCase();
        if (text && answer.toLowerCase().includes(text)) {
          try { await r.check(); return true; } catch { return false; }
        }
      }
      return false;
    }
    case "checkbox": {
      const want = /^y(es)?|true|1|i agree/i.test(answer.trim());
      try {
        if (want) await field.el.check();
        else await field.el.uncheck().catch(() => {});
        return true;
      } catch { return false; }
    }
    case "file": {
      // File answer is path to resume PDF, set externally; skip here
      return false;
    }
  }
  return false;
}
