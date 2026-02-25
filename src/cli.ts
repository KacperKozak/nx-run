#!/usr/bin/env bun
import React, { useState, useMemo, useEffect } from "react";
import { render } from "ink";
import { scanWorkspace } from "./scan.ts";
import { createSearcher } from "./search.ts";
import { getWorkspaceRoot, getNxBin, loadHistory, saveHistory, pruneHistory, clearHistory, nukeAllHistory } from "./history.ts";
import { loadCache, saveCache, deleteCache, nukeAllCaches } from "./cache.ts";
import { runTasks } from "./run.ts";
import App from "./app.tsx";
import type { NxTarget } from "./types.ts";

// Handle --nuke before anything else
if (process.argv.includes("--nuke")) {
  nukeAllCaches();
  nukeAllHistory();
  console.log("All nxr caches and history removed.");
  process.exit(0);
}

const root = getWorkspaceRoot();
if (!root) {
  console.error("Could not find nx.json in any parent directory.");
  process.exit(1);
}

const nx = getNxBin(root);

const cached = await loadCache(root);
const initialTargets: NxTarget[] = cached ?? [];

let syncPromise: Promise<void> | null = null;
let initialScanPromise: Promise<NxTarget[]> | null = null;

if (cached) {
  // Background rescan — fire and forget, result used on next invocation
  syncPromise = scanWorkspace(nx).then((fresh) => {
    saveCache(root, fresh);
    const validCommands = new Set(fresh.map((t) => t.command));
    pruneHistory(root, validCommands);
  });
} else {
  // No cache — scan in background, UI shows immediately
  initialScanPromise = scanWorkspace(nx).then(async (fresh) => {
    await saveCache(root, fresh);
    return fresh;
  });
}

const history = loadHistory(root);

interface AppLoaderProps {
  onSelect: (commands: string[]) => void;
  onCommand: (cmd: string) => void;
}

function AppLoader({ onSelect, onCommand }: AppLoaderProps) {
  const [targets, setTargets] = useState(initialTargets);
  const [isLoading, setIsLoading] = useState(!!initialScanPromise);

  const searcher = useMemo(() => createSearcher(targets), [targets]);

  useEffect(() => {
    if (!initialScanPromise) return;
    initialScanPromise.then(
      (fresh) => {
        if (fresh.length === 0) {
          onCommand("__no_targets");
          return;
        }
        setTargets(fresh);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, []);

  return React.createElement(App, {
    targets,
    history,
    searcher,
    syncPromise,
    isLoading,
    onSelect,
    onCommand,
  });
}

// Wait for user selection
const selected = await new Promise<string[]>((resolve) => {
  const app = render(
    React.createElement(AppLoader, {
      onSelect: (commands: string[]) => {
        app.unmount();
        resolve(commands);
      },
      onCommand: async (cmd: string) => {
        app.unmount();
        if (cmd === "__no_targets") {
          console.error("No targets found in workspace.");
          process.exit(1);
        } else if (cmd === "reset") {
          deleteCache(root);
          clearHistory(root);
          console.log("Cache and history cleared for this workspace.");
          process.exit(0);
        } else if (cmd === "nuke") {
          nukeAllCaches();
          nukeAllHistory();
          console.log("All nxr caches and history removed.");
          process.exit(0);
        } else if (cmd === "sync") {
          process.stderr.write("  Rescanning workspace...");
          const fresh = await scanWorkspace(nx);
          await saveCache(root, fresh);
          process.stderr.write("\r\x1b[K");
          console.log(`Synced ${fresh.length} targets.`);
          process.exit(0);
        }
      },
    }),
  );

  app.waitUntilExit().then(() => {
    // If exited without selection (Ctrl+C / Esc), exit process
    resolve([]);
  });
});

if (selected.length === 0) {
  process.exit(0);
}

saveHistory(root, selected);

console.log(`\nRunning: ${selected.join(", ")}\n`);
const exitCode = await runTasks(nx, selected);
process.exit(exitCode);
