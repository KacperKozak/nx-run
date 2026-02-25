export async function runTasks(nx: string, commands: string[]): Promise<number> {
  const procs = commands.map((cmd) =>
    Bun.spawn([nx, "run", cmd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );

  const codes = await Promise.all(procs.map((p) => p.exited));
  const failed = codes.find((c) => c !== 0);
  return failed ?? 0;
}
