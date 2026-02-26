#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PLATFORMS = {
  "darwin-arm64": "@nx-run/darwin-arm64",
  "darwin-x64": "@nx-run/darwin-x64",
  "linux-x64": "@nx-run/linux-x64",
  "linux-arm64": "@nx-run/linux-arm64",
  "win32-x64": "@nx-run/win32-x64",
};

const key = `${process.platform}-${process.arch}`;
const pkg = PLATFORMS[key];

if (!pkg) {
  console.error(
    `nxr: unsupported platform ${process.platform}-${process.arch}. ` +
      `Supported: ${Object.keys(PLATFORMS).join(", ")}`,
  );
  process.exit(1);
}

let binPath;
try {
  const require = createRequire(
    join(dirname(fileURLToPath(import.meta.url)), ".."),
  );
  const pkgJson = require.resolve(`${pkg}/package.json`);
  const pkgDir = dirname(pkgJson);
  const bin = process.platform === "win32" ? "nxr.exe" : "nxr";
  binPath = join(pkgDir, "bin", bin);
} catch {
  console.error(
    `nxr: could not find package "${pkg}". Make sure it's installed.\n` +
      `Try: npm install (optionalDependencies should pull it in)`,
  );
  process.exit(1);
}

try {
  execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
} catch (e) {
  process.exit(e.status ?? 1);
}
