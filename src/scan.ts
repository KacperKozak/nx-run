import type { NxTarget } from "./types.ts";

let nxBin = "nx";

async function exec(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`Command failed: ${cmd.join(" ")}\n${err}`);
  }
  return text.trim();
}

export async function scanWorkspace(nx: string): Promise<NxTarget[]> {
  nxBin = nx;
  const projectsRaw = await exec([nxBin, "show", "projects"]);
  const projects = projectsRaw.split("\n").filter(Boolean);

  const batchSize = 12;
  const targets: NxTarget[] = [];

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (name) => {
        const json = await exec([nxBin, "show", "project", name, "--json"]);
        const config = JSON.parse(json);
        const targetNames = Object.keys(config.targets ?? {});
        return targetNames.map(
          (t): NxTarget => ({
            project: name,
            target: t,
            command: `${name}:${t}`,
          }),
        );
      }),
    );
    targets.push(...results.flat());
  }

  return targets;
}
