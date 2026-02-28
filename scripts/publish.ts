#!/usr/bin/env bun

import { readdirSync } from "node:fs";
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
    stderr: "pipe",
  });

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString();
    if (stderr.includes("cannot publish over the previously published")) {
      console.log("  ⏭ Already published, skipping.");
      return;
    }
    process.stderr.write(stderr);
    console.error(`Failed to publish ${dir}`);
    process.exit(1);
  }
}

// 1. Publish platform packages first
let allEntries: string[];
try {
  allEntries = readdirSync(NPM_DIR);
} catch {
  console.error("npm/ directory not found. Run `bun scripts/build.ts` first.");
  process.exit(1);
}
const platforms: string[] = [];
for (const d of allEntries) {
  if (await Bun.file(join(NPM_DIR, d, "package.json")).exists()) {
    platforms.push(d);
  }
}

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
