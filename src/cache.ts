import { join } from "path";
import { homedir } from "os";
import { mkdirSync, rmSync } from "fs";
import type { NxTarget } from "./types.ts";

const CACHE_DIR = join(homedir(), ".config", "nxr", "cache");

interface CacheData {
  root: string;
  targets: NxTarget[];
  timestamp: number;
}

export function getCachePath(root: string): string {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(root);
  const hash = hasher.digest("hex");
  return join(CACHE_DIR, `${hash}.json`);
}

export async function loadCache(root: string): Promise<NxTarget[] | null> {
  try {
    const file = Bun.file(getCachePath(root));
    const data: CacheData = await file.json();
    if (data.root === root && Array.isArray(data.targets)) {
      return data.targets;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveCache(root: string, targets: NxTarget[]): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const data: CacheData = {
    root,
    targets,
    timestamp: Date.now(),
  };
  await Bun.write(getCachePath(root), JSON.stringify(data, null, 2) + "\n");
}

export function deleteCache(root: string): void {
  rmSync(getCachePath(root), { force: true });
}

export function nukeAllCaches(): void {
  rmSync(CACHE_DIR, { recursive: true, force: true });
}
