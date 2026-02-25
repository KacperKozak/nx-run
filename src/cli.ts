#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { scanWorkspace } from "./scan.ts";
import { createSearcher } from "./search.ts";
import { getWorkspaceRoot, getNxBin, loadHistory, saveHistory } from "./history.ts";
import { loadCache, saveCache } from "./cache.ts";
import { runTasks } from "./run.ts";
import App from "./app.tsx";

const root = getWorkspaceRoot();
if (!root) {
  console.error("Could not find nx.json in any parent directory.");
  process.exit(1);
}

const nx = getNxBin(root);

let targets;
let syncPromise: Promise<void> | null = null;

const cached = await loadCache(root);

if (cached) {
  targets = cached;
  // Background rescan — fire and forget, result used on next invocation
  syncPromise = scanWorkspace(nx).then((fresh) => {
    saveCache(root, fresh);
  });
} else {
  process.stderr.write("  Scanning NX workspace...");
  targets = await scanWorkspace(nx);
  process.stderr.write("\r\x1b[K");
  await saveCache(root, targets);
}

if (targets.length === 0) {
  console.error("No targets found in workspace.");
  process.exit(1);
}

const searcher = createSearcher(targets);
const history = loadHistory(root);

// Wait for user selection
const selected = await new Promise<string[]>((resolve) => {
  const app = render(
    React.createElement(App, {
      targets,
      history,
      searcher,
      syncPromise,
      onSelect: (commands: string[]) => {
        app.unmount();
        resolve(commands);
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
