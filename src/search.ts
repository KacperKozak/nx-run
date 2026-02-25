import Fuse from "fuse.js";
import type { NxTarget } from "./types.ts";

// Split "@scope/foo-bar-baz" into segments: ["scope", "foo", "bar", "baz"]
function segments(value: string): string[] {
  return value.replace(/^@/, "").split(/[/\-_]+/).filter(Boolean);
}

// Score how well a token matches a field value (lower = better)
// 0.0 = exact segment match, 0.1 = segment starts with token, 0.3 = substring, 0.5 = no direct match
function segmentScore(token: string, value: string): number {
  const lower = token.toLowerCase();
  const segs = segments(value.toLowerCase());
  for (const seg of segs) {
    if (seg === lower) return 0.0;
  }
  for (const seg of segs) {
    if (seg.startsWith(lower)) return 0.1;
  }
  if (value.toLowerCase().includes(lower)) return 0.3;
  return 0.5;
}

export function createSearcher(
  targets: NxTarget[],
): (term: string) => NxTarget[] {
  const projectFuse = new Fuse(targets, {
    keys: ["project"],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  const targetFuse = new Fuse(targets, {
    keys: ["target"],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  function scoreToken(token: string): Map<string, number> {
    const scores = new Map<string, number>();
    for (const r of projectFuse.search(token)) {
      const key = r.item.command;
      scores.set(key, Math.min(scores.get(key) ?? 1, r.score ?? 1));
    }
    for (const r of targetFuse.search(token)) {
      const key = r.item.command;
      scores.set(key, Math.min(scores.get(key) ?? 1, r.score ?? 1));
    }
    return scores;
  }

  return (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return targets;

    const tokens = trimmed.split(/\s+/);
    const perToken = tokens.map(scoreToken);

    // Intersect: item must appear in every token's results
    const candidates = targets.filter((t) =>
      perToken.every((m) => m.has(t.command)),
    );

    // Rank by combined segment-aware score
    candidates.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      for (const token of tokens) {
        // Best segment score across project and target fields
        const segA = Math.min(
          segmentScore(token, a.project),
          segmentScore(token, a.target),
        );
        const segB = Math.min(
          segmentScore(token, b.project),
          segmentScore(token, b.target),
        );
        scoreA += segA;
        scoreB += segB;
      }
      if (scoreA !== scoreB) return scoreA - scoreB;

      // Tiebreak: prefer shorter project names (more specific match)
      return a.project.length - b.project.length;
    });

    return candidates;
  };
}
