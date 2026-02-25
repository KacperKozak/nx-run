import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".config", "nxr");
const HISTORY_FILE = join(CONFIG_DIR, "history.json");
const MAX_HISTORY = 5;

type HistoryData = Record<string, string[]>;

export function getWorkspaceRoot(): string | null {
  let dir = resolve(process.cwd());
  while (true) {
    if (existsSync(join(dir, "nx.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function getNxBin(root: string): string {
  const local = join(root, "node_modules", ".bin", "nx");
  if (existsSync(local)) return local;
  return "nx"; // fallback to PATH
}

function readHistoryFile(): HistoryData {
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function loadHistory(root: string): string[] {
  const data = readHistoryFile();
  return (data[root] ?? []).slice(0, MAX_HISTORY);
}

export function saveHistory(root: string, commands: string[]): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const data = readHistoryFile();
  const existing = data[root] ?? [];
  const merged = [...commands, ...existing.filter((c) => !commands.includes(c))];
  data[root] = merged.slice(0, MAX_HISTORY);
  writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
}

export function pruneHistory(root: string, validCommands: Set<string>): void {
  const data = readHistoryFile();
  const existing = data[root] ?? [];
  const pruned = existing.filter((cmd) => validCommands.has(cmd));
  if (pruned.length !== existing.length) {
    data[root] = pruned;
    writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
  }
}

export function clearHistory(root: string): void {
  const data = readHistoryFile();
  delete data[root];
  writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
}

export function nukeAllHistory(): void {
  rmSync(HISTORY_FILE, { force: true });
}
