import { test, expect, describe } from "bun:test";
import { createSearcher } from "./search.ts";
import type { NxTarget } from "./types.ts";

function t(project: string, target: string): NxTarget {
  return { project, target, command: `${project}:${target}` };
}

const targets: NxTarget[] = [
  t("@my/app", "build"),
  t("@my/app", "serve"),
  t("@my/app", "format"),
  t("@my/app", "lint"),
  t("@my/app", "test"),
  t("@my/ui-button", "format"),
  t("@my/ui-button", "ci"),
  t("@my/logger", "format"),
  t("@my/logger", "ci"),
  t("@my/dashboard", "build"),
  t("@my/dashboard", "format"),
  t("@my/icons", "format"),
  t("@my/icons", "ci"),
  t("@my/vite-svg", "format"),
  t("@my/vite-svg", "ci"),
];

const search = createSearcher(targets);

describe("search", () => {
  test("empty query returns all targets", () => {
    expect(search("")).toHaveLength(targets.length);
    expect(search("  ")).toHaveLength(targets.length);
  });

  test("single token matches project name", () => {
    const results = search("app");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.project).toContain("app");
  });

  test("single token matches target name — exact target matches rank first", () => {
    const results = search("format");
    expect(results.length).toBeGreaterThan(0);
    const firstFew = results.slice(0, 6);
    expect(firstFew.every((r) => r.target === "format")).toBe(true);
  });

  test("'app format' returns @my/app:format first", () => {
    const results = search("app format");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@my/app:format");
  });

  test("'app for' returns @my/app:format first", () => {
    const results = search("app for");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@my/app:format");
  });

  test("'app build' returns @my/app:build first", () => {
    const results = search("app build");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@my/app:build");
  });

  test("'app ser' matches app:serve", () => {
    const results = search("app ser");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@my/app:serve");
  });

  test("multi-token intersects — both tokens must match", () => {
    const results = search("vite format");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.project).toContain("vite");
    expect(results[0]!.target).toBe("format");
  });

  test("exact segment ranks above prefix match", () => {
    const extended = [
      ...targets,
      t("@my/apricot", "format"),
      t("@my/apex-cli", "format"),
    ];
    const s = createSearcher(extended);
    const results = s("app format");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@my/app:format");
  });

  test("no results for impossible combo", () => {
    const results = search("zzzzz xxxxx");
    expect(results).toHaveLength(0);
  });
});
