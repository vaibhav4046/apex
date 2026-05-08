import kleur from "kleur";
import { readApps } from "../lib/store.js";

export async function historyCommand() {
  const apps = readApps().sort((a, b) => b.appliedAt - a.appliedAt);
  if (apps.length === 0) {
    console.log(kleur.dim("No applications yet. Run `apex apply`."));
    return;
  }
  const counts = apps.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {});
  console.log(kleur.bold().cyan(`\n  Apex history — ${apps.length} applications`));
  console.log(`  ${Object.entries(counts).map(([k, v]) => `${kleur.dim(k)}: ${v}`).join("  ·  ")}\n`);
  for (const a of apps.slice(0, 30)) {
    const date = new Date(a.appliedAt).toISOString().slice(0, 16).replace("T", " ");
    const statusColor = a.status === "submitted" ? kleur.green : a.status === "error" ? kleur.red : kleur.yellow;
    console.log(`  ${kleur.dim(date)}  ${statusColor(a.status.padEnd(9))}  ${kleur.cyan(a.jobTitle)} @ ${a.company}`);
    if (a.message) console.log(`    ${kleur.dim(a.message.slice(0, 100))}`);
  }
  console.log("");
}
