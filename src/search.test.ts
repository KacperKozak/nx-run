import { test, expect, describe } from "bun:test";
import { createSearcher } from "./search.ts";
import type { NxTarget } from "./types.ts";

function t(project: string, target: string): NxTarget {
  return { project, target, command: `${project}:${target}` };
}

const targets: NxTarget[] = [
  t("@deel-frontend/app", "build"),
  t("@deel-frontend/app", "serve"),
  t("@deel-frontend/app", "format"),
  t("@deel-frontend/app", "lint"),
  t("@deel-frontend/app", "test"),
  t("@deel-frontend/components-job-information-update", "format"),
  t("@deel-frontend/components-job-information-update", "ci"),
  t("@deel-frontend/scene-equity-grant-information", "format"),
  t("@deel-frontend/scene-equity-grant-information", "ci"),
  t("@deel-frontend/other-app", "build"),
  t("@deel-frontend/other-app", "format"),
  t("@deel-frontend/components-eor-employment-verification-letter", "format"),
  t("@deel-frontend/components-eor-employment-verification-letter", "ci"),
  t("@deel-frontend/vite-plugin-publish-bundle-metrics", "format"),
  t("@deel-frontend/vite-plugin-publish-bundle-metrics", "ci"),
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
    // app projects should rank first
    expect(results[0]!.project).toContain("app");
  });

  test("single token matches target name — exact target matches rank first", () => {
    const results = search("format");
    expect(results.length).toBeGreaterThan(0);
    // Exact target matches should come before fuzzy project-only matches
    const firstFew = results.slice(0, 6);
    expect(firstFew.every((r) => r.target === "format")).toBe(true);
  });

  test("'app format' returns @deel-frontend/app:format first", () => {
    const results = search("app format");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@deel-frontend/app:format");
  });

  test("'app for' returns @deel-frontend/app:format first", () => {
    const results = search("app for");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@deel-frontend/app:format");
  });

  test("'app build' returns @deel-frontend/app:build first", () => {
    const results = search("app build");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@deel-frontend/app:build");
  });

  test("'app ser' matches app:serve", () => {
    const results = search("app ser");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.command).toBe("@deel-frontend/app:serve");
  });

  test("multi-token intersects — both tokens must match", () => {
    const results = search("vite format");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.project).toContain("vite");
    expect(results[0]!.target).toBe("format");
  });

  test("'app format' ranks exact 'app' segment above 'approval'", () => {
    const extended = [
      ...targets,
      t("@deel-frontend/scene-approval-requests", "format"),
      t("@deel-frontend/scene-approval-policy", "format"),
      t("@deel-frontend/components-approvals", "format"),
    ];
    const s = createSearcher(extended);
    const results = s("app format");
    expect(results.length).toBeGreaterThan(0);
    // @deel-frontend/app:format must come before any approval-* matches
    expect(results[0]!.command).toBe("@deel-frontend/app:format");
  });

  test("no results for impossible combo", () => {
    const results = search("zzzzz xxxxx");
    expect(results).toHaveLength(0);
  });
});
