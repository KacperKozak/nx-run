import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import type { NxTarget } from "./types.ts";

const MAX_VISIBLE = 15;

interface AppProps {
  targets: NxTarget[];
  history: string[];
  searcher: (term: string) => NxTarget[];
  onSelect: (commands: string[]) => void;
  syncPromise?: Promise<void> | null;
}

export default function App({ targets, history, searcher, onSelect, syncPromise }: AppProps) {
  const { exit } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [queue, setQueue] = useState<NxTarget[]>([]);
  const [isSyncing, setIsSyncing] = useState(!!syncPromise);

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

  const isSearching = query.trim().length > 0;

  const results = useMemo(() => {
    if (!isSearching) return [];
    return searcher(query).slice(0, MAX_VISIBLE);
  }, [query, isSearching, searcher]);

  const activeList = isSearching ? results : historyTargets;

  useInput((input, key) => {
    if (key.escape || (input === "c" && key.ctrl)) {
      exit();
      return;
    }

    if (key.tab) {
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

    if (key.return) {
      if (queue.length > 0) {
        onSelect(queue.map((q) => q.command));
      } else if (activeList[cursor]) {
        onSelect([activeList[cursor]!.command]);
      }
      return;
    }

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((c) => Math.min(activeList.length - 1, c + 1));
      return;
    }

    // Ctrl+Backspace / Cmd+Backspace: clear search input
    if (key.backspace && (key.ctrl || key.meta)) {
      setQuery("");
      setCursor(0);
      return;
    }

    if (key.backspace || key.delete) {
      if (query === "" && queue.length > 0) {
        setQueue((prev) => prev.slice(0, -1));
        return;
      }
    }
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCursor(0);
  };

  const showList = activeList.length > 0;
  const showEmptyHint = !isSearching && historyTargets.length === 0;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>  </Text>
        <Box flexGrow={1}>
          <TextInput value={query} onChange={handleQueryChange} />
        </Box>
        {isSyncing && <Text dimColor>syncing...</Text>}
      </Box>
      <Text dimColor>  {"─".repeat(40)}</Text>

      {showEmptyHint && (
        <Text dimColor>  No recent runs yet</Text>
      )}

      {showList && (
        <Box flexDirection="column">
          {(() => {
            const pad = Math.max(...activeList.map((r) => r.project.length)) + 2;
            return activeList.map((item, i) => {
              const isSelected = i === cursor;
              const inQueue = queue.some((q) => q.command === item.command);
              return (
                <Text key={item.command}>
                  {isSelected ? (
                    <Text color="cyan">  ❯ </Text>
                  ) : (
                    <Text>    </Text>
                  )}
                  <Text color={isSelected ? "cyan" : undefined} dimColor={inQueue}>
                    {item.project.padEnd(pad)}{item.target}
                  </Text>
                  {inQueue && <Text color="yellow"> ✓</Text>}
                </Text>
              );
            });
          })()}
        </Box>
      )}

      {queue.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text>  Queue [{queue.length}]:</Text>
          {queue.map((item, i) => (
            <Text key={item.command}>
              <Text dimColor>    {i + 1}. {item.command}</Text>
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
