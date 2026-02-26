#!/usr/bin/env bun

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const NPM_DIR = join(ROOT, "npm");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tagIdx = args.indexOf("--tag");
const tag = tagIdx !== -1 ? args[tagIdx + 1] : undefined;

function npmPublish(dir: string) {
  const cmd = ["npm", "publish"];
  if (dryRun) cmd.push("--dry-run");
  if (tag) cmd.push("--tag", tag);
  cmd.push("--access", "public");

  console.log(`\n$ ${cmd.join(" ")} (in ${dir})`);

  const proc = Bun.spawnSync(cmd, {
    cwd: dir,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if (proc.exitCode !== 0) {
    console.error(`Failed to publish ${dir}`);
    process.exit(1);
  }
}

// 1. Publish platform packages first
if (!existsSync(NPM_DIR)) {
  console.error("npm/ directory not found. Run `bun scripts/build.ts` first.");
  process.exit(1);
}

const platforms = readdirSync(NPM_DIR).filter((d) =>
  existsSync(join(NPM_DIR, d, "package.json")),
);

console.log(`Publishing ${platforms.length} platform packages...`);
for (const platform of platforms) {
  npmPublish(join(NPM_DIR, platform));
}

// 2. Publish main package
console.log("\nPublishing main nx-run package...");
npmPublish(ROOT);

console.log(
  `\nDone!${dryRun ? " (dry-run)" : ""}`,
);
