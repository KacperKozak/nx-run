#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PKG_PATH = join(ROOT, "package.json");

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
console.log(`Current version: ${pkg.version}`);

const version = prompt("New version:")?.trim();
if (!version) {
  console.log("Aborted.");
  process.exit(0);
}

if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`Invalid semver: ${version}`);
  process.exit(1);
}

pkg.version = version;
for (const key of Object.keys(pkg.optionalDependencies ?? {})) {
  pkg.optionalDependencies[key] = version;
}
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

const proc = Bun.spawnSync(
  ["git", "commit", "-am", `v${version}`],
  { cwd: ROOT, stdout: "inherit", stderr: "inherit" },
);

if (proc.exitCode !== 0) {
  console.error("Git commit failed.");
  process.exit(1);
}

console.log(`Bumped to v${version} and committed.`);
