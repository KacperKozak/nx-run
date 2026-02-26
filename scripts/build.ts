#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../package.json";

const VERSION = pkg.version;

const TARGETS = [
  { os: "darwin", arch: "arm64", bunTarget: "bun-darwin-arm64" },
  { os: "darwin", arch: "x64", bunTarget: "bun-darwin-x64" },
  { os: "linux", arch: "x64", bunTarget: "bun-linux-x64" },
  { os: "linux", arch: "arm64", bunTarget: "bun-linux-arm64" },
  { os: "win32", arch: "x64", bunTarget: "bun-windows-x64" },
] as const;

const ROOT = join(import.meta.dir, "..");
const NPM_DIR = join(ROOT, "npm");

for (const target of TARGETS) {
  const platformKey = `${target.os}-${target.arch}`;
  const pkgName = `@nx-run/${platformKey}`;
  const outDir = join(NPM_DIR, platformKey);
  const binDir = join(outDir, "bin");
  const isWindows = target.os === "win32";
  const binName = isWindows ? "nxr.exe" : "nxr";
  const outPath = join(binDir, binName);

  mkdirSync(binDir, { recursive: true });

  console.log(`Building ${pkgName} (${target.bunTarget})...`);

  const proc = Bun.spawn(
    [
      "bun",
      "build",
      "--compile",
      `--target=${target.bunTarget}`,
      "--outfile",
      outPath,
      join(ROOT, "src", "cli.ts"),
    ],
    {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      cwd: ROOT,
    },
  );

  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Failed to build ${pkgName}`);
    process.exit(1);
  }

  const platformPkg = {
    name: pkgName,
    version: VERSION,
    description: `nxr binary for ${platformKey}`,
    os: [target.os],
    cpu: [target.arch === "x64" ? "x64" : target.arch],
    bin: { nxr: `bin/${binName}` },
    files: ["bin/"],
    license: "MIT",
    repository: {
      type: "git",
      url: "https://github.com/kacper-sx/nxr",
    },
    publishConfig: {
      access: "public",
    },
  };

  writeFileSync(
    join(outDir, "package.json"),
    JSON.stringify(platformPkg, null, 2) + "\n",
  );

  console.log(`  ✓ ${pkgName}@${VERSION} → ${outPath}`);
}

console.log(`\nAll ${TARGETS.length} platform packages built (v${VERSION}).`);
