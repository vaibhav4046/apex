import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type LanguageModelV1 } from "ai";

type Provider = { name: string; model: LanguageModelV1; free: boolean };

function groq(): Provider | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const p = createOpenAICompatible({ name: "groq", baseURL: "https://api.groq.com/openai/v1", apiKey: key });
  return { name: "groq", model: p(model), free: true };
}

function cerebras(): Provider | null {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) return null;
  const model = process.env.CEREBRAS_MODEL ?? "llama-3.3-70b";
  const p = createOpenAICompatible({ name: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKey: key });
  return { name: "cerebras", model: p(model), free: true };
}

function ollama(): Provider | null {
  const enabled = process.env.OLLAMA_ENABLED === "1" || !!process.env.OLLAMA_MODEL;
  if (!enabled) return null;
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";
  const p = createOpenAICompatible({ name: "ollama", baseURL, apiKey: "ollama" });
  return { name: "ollama", model: p(model), free: true };
}

function gemini(): Provider | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-exp";
  // Gemini supports OpenAI-compat endpoint
  const p = createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: key,
  });
  return { name: "gemini", model: p(model), free: true };
}

export function availableProviders(): Provider[] {
  const out: Provider[] = [];
  const o = ollama(); if (o) out.push(o);
  const c = cerebras(); if (c) out.push(c);
  const g = groq(); if (g) out.push(g);
  const ge = gemini(); if (ge) out.push(ge);
  return out;
}

export async function llmGenerate(prompt: string, system?: string): Promise<{ text: string; provider: string }> {
  const providers = availableProviders();
  if (providers.length === 0) {
    throw new Error("No LLM provider configured. Set GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, or run Ollama locally (OLLAMA_ENABLED=1).");
  }
  let lastErr: unknown;
  for (const p of providers) {
    try {
      const r = await generateText({ model: p.model, system, prompt, maxTokens: 2000 });
      return { text: r.text, provider: p.name };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`All providers failed. Last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}
