import fs from "node:fs";
import path from "node:path";
import { APEX_DIR } from "./store.js";

const CACHE_PATH = path.join(APEX_DIR, "answers.json");

type Cache = Record<string, string>;

function load(): Cache {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")); } catch { return {}; }
}
function save(c: Cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), "utf8");
}

/** Normalize question text for cache key. */
function key(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 200);
}

export function getCached(question: string): string | null {
  const c = load();
  return c[key(question)] ?? null;
}

export function setCached(question: string, answer: string) {
  const c = load();
  c[key(question)] = answer;
  save(c);
}
