#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import kleur from "kleur";
import { initCommand } from "./commands/init.js";
import { resumeCommand } from "./commands/resume.js";
import { coverCommand } from "./commands/cover.js";
import { applyCommand } from "./commands/apply.js";
import { historyCommand } from "./commands/history.js";

const program = new Command();
program
  .name("apex")
  .description(kleur.cyan("apex") + " — autonomous job application engine. Generates tailored resume + cover letter, applies on LinkedIn.")
  .version("0.1.0");

program.command("init").description("Set up your profile interactively").action(initCommand);

program
  .command("resume")
  .description("Generate a tailored 1-page resume PDF")
  .option("--job-url <url>", "Job posting URL to fetch description from")
  .option("--job-description <text>", "Paste job description directly")
  .option("--out <path>", "Output PDF path")
  .action(resumeCommand);

program
  .command("cover")
  .description("Generate a cover letter")
  .option("--job-url <url>")
  .option("--job-description <text>")
  .option("--company <name>")
  .option("--role <title>")
  .option("--out <path>")
  .action(coverCommand);

program
  .command("apply")
  .description("Auto-apply to jobs (LinkedIn Easy Apply)")
  .option("-q, --query <text>", "Search query (defaults to first target role)")
  .option("-l, --location <text>", "Location filter")
  .option("-n, --limit <num>", "Max applications (ignored if --all)", (v) => parseInt(v, 10), 10)
  .option("--all", "Run until LinkedIn daily Easy Apply cap or rate-limit hit")
  .option("-y, --yes", "Skip confirmation prompt (for non-interactive runs)")
  .option("--dry-run", "Generate resumes but do not submit")
  .option("--headless", "Run browser headless (you must be logged in already)")
  .option("--platform <name>", "linkedin | indeed", "linkedin")
  .option("--delay <ms>", "Delay between applications", (v) => parseInt(v, 10), 2500)
  .action(applyCommand);

program.command("history").description("Show recent applications").action(historyCommand);

program.parseAsync(process.argv).catch((e) => {
  console.error(kleur.red("\n  apex error: ") + (e instanceof Error ? e.message : String(e)) + "\n");
  process.exit(1);
});
