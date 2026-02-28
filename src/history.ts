import { mkdirSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".config", "nxr");
const HISTORY_FILE = join(CONFIG_DIR, "history.json");
const MAX_HISTORY = 5;

type HistoryData = Record<string, string[]>;

export async function getWorkspaceRoot(): Promise<string | null> {
  let dir = resolve(process.cwd());
  while (true) {
    if (await Bun.file(join(dir, "nx.json")).exists()) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function getNxBin(root: string): Promise<string> {
  const local = join(root, "node_modules", ".bin", "nx");
  if (await Bun.file(local).exists()) return local;
  return "nx"; // fallback to PATH
}

async function readHistoryFile(): Promise<HistoryData> {
  try {
    return await Bun.file(HISTORY_FILE).json();
  } catch {
    return {};
  }
}

export async function loadHistory(root: string): Promise<string[]> {
  const data = await readHistoryFile();
  return (data[root] ?? []).slice(0, MAX_HISTORY);
}

export async function saveHistory(root: string, commands: string[]): Promise<void> {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const data = await readHistoryFile();
  const existing = data[root] ?? [];
  const merged = [...commands, ...existing.filter((c) => !commands.includes(c))];
  data[root] = merged.slice(0, MAX_HISTORY);
  await Bun.write(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
}

export async function pruneHistory(root: string, validCommands: Set<string>): Promise<void> {
  const data = await readHistoryFile();
  const existing = data[root] ?? [];
  const pruned = existing.filter((cmd) => validCommands.has(cmd));
  if (pruned.length !== existing.length) {
    data[root] = pruned;
    await Bun.write(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
  }
}

export async function clearHistory(root: string): Promise<void> {
  const data = await readHistoryFile();
  delete data[root];
  await Bun.write(HISTORY_FILE, JSON.stringify(data, null, 2) + "\n");
}

export function nukeAllHistory(): void {
  rmSync(HISTORY_FILE, { force: true });
}
