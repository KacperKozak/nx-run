import React, { useState, useMemo, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import type { NxTarget } from "./types.ts";

const COMMANDS = [
  { name: "reset", description: "Clear cache and history for this workspace" },
  { name: "nuke", description: "Remove all caches from all projects" },
  { name: "sync", description: "Rescan workspace now" },
];

interface AppProps {
  targets: NxTarget[];
  history: string[];
  searcher: (term: string) => NxTarget[];
  onSelect: (commands: string[]) => void;
  onCommand: (cmd: string) => void;
  syncPromise?: Promise<void> | null;
}

export default function App({ targets, history, searcher, onSelect, onCommand, syncPromise }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [queue, setQueue] = useState<NxTarget[]>([]);
  const [isSyncing, setIsSyncing] = useState(!!syncPromise);

  const termHeight = stdout?.rows ?? 24;

  useEffect(() => {
    if (!syncPromise) return;
    syncPromise.then(() => setIsSyncing(false), () => setIsSyncing(false));
  }, [syncPromise]);

  const historyTargets = useMemo(() => {
    return history
      .map((cmd) => {
        const sep = cmd.lastIndexOf(":");
        if (sep === -1) return null;
        return targets.find((t) => t.command === cmd) ?? {
          project: cmd.slice(0, sep),
          target: cmd.slice(sep + 1),
          command: cmd,
        };
      })
      .filter(Boolean) as NxTarget[];
  }, [history, targets]);

  const isCommandMode = query.startsWith("/");
  const isSearching = !isCommandMode && query.trim().length > 0;

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return [];
    const filter = query.slice(1).toLowerCase();
    return COMMANDS.filter((c) => c.name.toLowerCase().startsWith(filter));
  }, [query, isCommandMode]);

  const results = useMemo(() => {
    if (!isSearching) return [];
    return searcher(query);
  }, [query, isSearching, searcher]);

  const activeList: NxTarget[] = isCommandMode ? [] : isSearching ? results : historyTargets;
  const listCount = isCommandMode ? filteredCommands.length : activeList.length;

  // input(1) + separator(1) + footer(1) + queue section
  const queueOverhead = queue.length > 0 ? queue.length + 2 : 0;
  const fixedRows = 3 + queueOverhead;
  const maxVisible = Math.max(3, termHeight - fixedRows);

  // Track previous query to detect changes and reset cursor/scroll
  const prevQueryRef = useRef(query);
  if (prevQueryRef.current !== query) {
    prevQueryRef.current = query;
    // Reset inline during render — no useEffect needed
    if (cursor !== 0) setCursor(0);
    if (scrollOffset !== 0) setScrollOffset(0);
  }

  // Clamp scroll offset
  const maxOffset = Math.max(0, listCount - maxVisible);
  const clampedOffset = Math.min(scrollOffset, maxOffset);

  useInput((input, key) => {
    if (key.escape || (input === "c" && key.ctrl)) {
      exit();
      return;
    }

    // Arrow navigation (works in both command mode and normal mode)
    if (key.upArrow) {
      setCursor((c) => {
        const next = Math.max(0, c - 1);
        setScrollOffset((off) => (next < off ? next : off));
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setCursor((c) => {
        const max = listCount - 1;
        const next = Math.min(max, c + 1);
        setScrollOffset((off) => (next >= off + maxVisible ? next - maxVisible + 1 : off));
        return next;
      });
      return;
    }

    // Enter
    if (key.return) {
      if (isCommandMode) {
        const cmd = filteredCommands[cursor];
        if (cmd) onCommand(cmd.name);
      } else if (queue.length > 0) {
        onSelect(queue.map((q) => q.command));
      } else if (activeList[cursor]) {
        onSelect([activeList[cursor]!.command]);
      }
      return;
    }

    // Tab — toggle queue (normal mode only)
    if (key.tab && !isCommandMode) {
      const item = activeList[cursor];
      if (item) {
        const inQueue = queue.some((q) => q.command === item.command);
        if (inQueue) {
          setQueue((prev) => prev.filter((q) => q.command !== item.command));
        } else {
          setQueue((prev) => [...prev, item]);
        }
      }
      return;
    }

    // Ctrl+Backspace / Cmd+Backspace: clear entire input
    if (key.backspace && (key.ctrl || key.meta)) {
      setQuery("");
      return;
    }

    // Backspace on empty input pops queue
    if ((key.backspace || key.delete) && query === "" && queue.length > 0) {
      setQueue((prev) => prev.slice(0, -1));
      return;
    }
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const showEmptyHint = !isSearching && !isCommandMode && historyTargets.length === 0;

  // Visible slice of the list
  const visibleTargets = activeList.slice(clampedOffset, clampedOffset + maxVisible);
  const visibleCommands = filteredCommands.slice(clampedOffset, clampedOffset + maxVisible);

  return (
    <Box flexDirection="column" height={termHeight}>
      {/* Search input — pinned top */}
      <Box flexShrink={0}>
        <Text>  </Text>
        <Box flexGrow={1}>
          <TextInput value={query} onChange={handleQueryChange} />
        </Box>
        {isSyncing && <Text dimColor>syncing...</Text>}
      </Box>
      <Box flexShrink={0}>
        <Text dimColor>  {"─".repeat(40)}</Text>
      </Box>

      {/* List area — fills available space */}
      <Box flexDirection="column" flexGrow={1}>
        {showEmptyHint && (
          <Text dimColor>  No recent runs yet</Text>
        )}

        {isCommandMode && visibleCommands.length > 0 &&
          visibleCommands.map((cmd, i) => {
            const realIndex = clampedOffset + i;
            const isSelected = realIndex === cursor;
            return (
              <Text key={cmd.name}>
                {isSelected ? (
                  <Text color="cyan">  {">"} </Text>
                ) : (
                  <Text>    </Text>
                )}
                <Text color={isSelected ? "cyan" : undefined}>
                  /{cmd.name}
                </Text>
                <Text dimColor>  {cmd.description}</Text>
              </Text>
            );
          })
        }

        {!isCommandMode && visibleTargets.length > 0 && (() => {
          const pad = Math.max(...visibleTargets.map((r) => r.project.length)) + 2;
          return visibleTargets.map((item, i) => {
            const realIndex = clampedOffset + i;
            const isSelected = realIndex === cursor;
            const inQueue = queue.some((q) => q.command === item.command);
            return (
              <Text key={item.command}>
                {isSelected ? (
                  <Text color="cyan">  {">"} </Text>
                ) : (
                  <Text>    </Text>
                )}
                <Text color={isSelected ? "cyan" : undefined} dimColor={inQueue}>
                  {item.project.padEnd(pad)}{item.target}
                </Text>
                {inQueue && <Text color="yellow"> {"\u2713"}</Text>}
              </Text>
            );
          });
        })()}
      </Box>

      {/* Queue — pinned above footer */}
      {queue.length > 0 && (
        <Box flexDirection="column" flexShrink={0} marginTop={1}>
          <Text>  Queue [{queue.length}]:</Text>
          {queue.map((item, i) => (
            <Text key={item.command}>
              <Text dimColor>    {i + 1}. {item.command}</Text>
            </Text>
          ))}
        </Box>
      )}

      {/* Footer — pinned bottom */}
      <Box flexShrink={0}>
        <Text dimColor>  tab select {"\u00b7"} enter run {"\u00b7"} / commands {"\u00b7"} esc quit</Text>
      </Box>
    </Box>
  );
}
