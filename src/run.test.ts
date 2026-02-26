import { test, expect, describe } from "bun:test";
import { groupByTarget, buildRunArgs, formatRunLabel } from "./run.ts";

describe("groupByTarget", () => {
  test("groups commands by target name", () => {
    const groups = groupByTarget([
      "@my/app:build",
      "@my/lib:build",
      "@my/app:test",
    ]);
    expect(groups.get("build")).toEqual(["@my/app", "@my/lib"]);
    expect(groups.get("test")).toEqual(["@my/app"]);
  });

  test("handles scoped packages with colons in name", () => {
    const groups = groupByTarget(["@scope/pkg:build"]);
    expect(groups.get("build")).toEqual(["@scope/pkg"]);
  });

  test("single command", () => {
    const groups = groupByTarget(["app:lint"]);
    expect(groups.size).toBe(1);
    expect(groups.get("lint")).toEqual(["app"]);
  });

  test("preserves insertion order of targets", () => {
    const groups = groupByTarget([
      "a:format",
      "b:build",
      "c:format",
    ]);
    const keys = Array.from(groups.keys());
    expect(keys).toEqual(["format", "build"]);
  });
});

describe("buildRunArgs", () => {
  test("single command uses nx run", () => {
    const args = buildRunArgs("nx", ["@my/app:build"]);
    expect(args).toEqual([["nx", "run", "@my/app:build"]]);
  });

  test("multiple commands with same target use run-many", () => {
    const args = buildRunArgs("nx", [
      "@my/app:build",
      "@my/lib:build",
    ]);
    expect(args).toEqual([
      ["nx", "run-many", "-t", "build", "-p", "@my/app", "@my/lib"],
    ]);
  });

  test("mixed targets produce multiple run-many calls", () => {
    const args = buildRunArgs("nx", [
      "@my/app:build",
      "@my/lib:format",
      "@my/other:build",
    ]);
    expect(args).toEqual([
      ["nx", "run-many", "-t", "build", "-p", "@my/app", "@my/other"],
      ["nx", "run-many", "-t", "format", "-p", "@my/lib"],
    ]);
  });

  test("uses provided nx binary path", () => {
    const args = buildRunArgs("/repo/node_modules/.bin/nx", ["app:test"]);
    expect(args[0]![0]).toBe("/repo/node_modules/.bin/nx");
  });
});

describe("formatRunLabel", () => {
  test("single command shows nx run", () => {
    const label = formatRunLabel(["@my/app:build"]);
    expect(label).toBe("nx run @my/app:build");
  });

  test("multiple same-target commands show single run-many", () => {
    const label = formatRunLabel([
      "@deel-frontend/dts:format",
      "@deel-frontend/log:format",
      "@deel-frontend/url:format",
    ]);
    expect(label).toBe(
      "nx run-many -t format -p @deel-frontend/dts @deel-frontend/log @deel-frontend/url",
    );
  });

  test("mixed targets show multiple lines", () => {
    const label = formatRunLabel([
      "@my/app:build",
      "@my/lib:test",
    ]);
    expect(label).toBe(
      "nx run-many -t build -p @my/app\nnx run-many -t test -p @my/lib",
    );
  });
});
