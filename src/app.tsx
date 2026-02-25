import React, { useState, useMemo } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import type { NxTarget } from "./types.ts";

const MAX_VISIBLE = 15;

interface AppProps {
  targets: NxTarget[];
  history: string[];
  searcher: (term: string) => NxTarget[];
  onSelect: (commands: string[]) => void;
}

export default function App({ targets, history, searcher, onSelect }: AppProps) {
  const { exit } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [queue, setQueue] = useState<NxTarget[]>([]);
  const [mode, setMode] = useState<"history" | "search">(
    history.length > 0 ? "history" : "search",
  );

  const results = useMemo(() => {
    if (mode === "history") return [];
    return searcher(query).slice(0, MAX_VISIBLE);
  }, [query, mode, searcher]);

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

  const activeList = mode === "history" ? historyTargets : results;

  useInput((input, key) => {
    if (key.escape || (input === "c" && key.ctrl)) {
      exit();
      return;
    }

    if (key.tab) {
      const item = activeList[cursor];
      if (item && !queue.some((q) => q.command === item.command)) {
        setQueue((prev) => [...prev, item]);
      }
      setQuery("");
      setCursor(0);
      if (mode === "history") setMode("search");
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

    if (key.backspace || key.delete) {
      if (query === "" && queue.length > 0) {
        setQueue((prev) => prev.slice(0, -1));
        return;
      }
    }
  });

  const handleQueryChange = (value: string) => {
    if (mode === "history" && value.length > 0) {
      setMode("search");
    }
    setQuery(value);
    setCursor(0);
  };

  return (
    <Box flexDirection="column">
      {mode === "history" && historyTargets.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>  Recent (Tab to select, Enter to run):</Text>
          {historyTargets.map((item, i) => (
            <Text key={item.command}>
              {i === cursor ? (
                <Text color="cyan">  ❯ {item.command}</Text>
              ) : (
                <Text>    {item.command}</Text>
              )}
            </Text>
          ))}
          <Text dimColor>{"\n  " + "─".repeat(30)}</Text>
        </Box>
      )}

      <Box>
        <Text>  Search: </Text>
        <TextInput value={query} onChange={handleQueryChange} />
      </Box>

      {mode === "search" && results.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {(() => {
            const pad = Math.max(...results.map((r) => r.project.length)) + 2;
            return results.map((item, i) => {
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
