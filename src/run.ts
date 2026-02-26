export function groupByTarget(commands: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const cmd of commands) {
    const sep = cmd.lastIndexOf(":");
    const project = cmd.slice(0, sep);
    const target = cmd.slice(sep + 1);
    const list = groups.get(target) ?? [];
    list.push(project);
    groups.set(target, list);
  }
  return groups;
}

export function buildRunArgs(nx: string, commands: string[]): string[][] {
  if (commands.length === 1) {
    return [[nx, "run", commands[0]!, "--no-tui"]];
  }
  const groups = groupByTarget(commands);
  return Array.from(groups, ([target, projects]) => [
    nx, "run-many", "-t", target, "-p", ...projects, "--no-tui",
  ]);
}

export function formatRunLabel(commands: string[]): string {
  return buildRunArgs("nx", commands)
    .map((args) => args.join(" "))
    .join("\n");
}

export async function runTasks(nx: string, commands: string[]): Promise<number> {
  for (const args of buildRunArgs(nx, commands)) {
    const proc = Bun.spawn(args, {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    if (code !== 0) return code;
  }
  return 0;
}
