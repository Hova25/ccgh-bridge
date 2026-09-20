import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { configuration } from "../configuration";
import { repositoryRoot } from "../project";

// Ownership is a line rather than a manifest: a manifest is one more file to go stale, and a
// marker travels with the thing it marks.
const marker = "# written by ccgh init; edits are overwritten";

const templates = fileURLToPath(new URL("../workflows", import.meta.url));

const defaultAction = "Hova25/ccgh-bridge@v1";

// A repository's own checks are its own: the commands come from `check` in ccgh.json, and the
// toolchain they need is inferred from what the repository looks like. This is the one part of
// the generated workflow that cannot be the same everywhere.
const checkSteps = ({ commands, bun }: { commands: string[]; bun: boolean }): string => {
  if (commands.length === 0) return "";

  const setup = bun
    ? [
        "",
        "      - uses: oven-sh/setup-bun@v2",
        "",
        "      - run: bun install --frozen-lockfile",
      ].join("\n")
    : "";

  return [setup, ...commands.map((command) => `\n      - run: ${command}`)].join("\n");
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const repository = repositoryRoot({ from: cwd });
  const settings = configuration({ from: cwd });
  const asked = argv.includes("--from") ? argv[argv.indexOf("--from") + 1] : undefined;
  const action = asked ?? settings.action ?? defaultAction;
  const directory = join(repository, ".github", "workflows");

  await mkdir(directory, { recursive: true });

  const refused: string[] = [];

  for (const name of (await readdir(templates)).sort()) {
    const destination = join(directory, name);

    if (existsSync(destination)) {
      const existing = await readFile(destination, "utf8");

      if (!existing.startsWith(marker)) {
        refused.push(name);
        continue;
      }
    }

    let body = (await readFile(join(templates, name), "utf8")).replaceAll("__ACTION__", action);

    if (name === "ccgh-validate.yml") {
      body += checkSteps({
        commands: settings.check ?? [],
        bun: existsSync(join(repository, "package.json")),
      });
    }

    await writeFile(destination, `${marker}\n${body}`, "utf8");
  }

  const file = join(repository, "ccgh.json");
  const current = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};

  await writeFile(file, `${JSON.stringify({ ...current, action }, null, 2)}\n`, "utf8");

  for (const name of refused) {
    process.stderr.write(`refusing ${name}: it was not written by ccgh init\n`);
  }

  process.stdout.write(
    `${(await readdir(templates)).length - refused.length} workflow(s) written, pointing at ${action}\n`,
  );

  return refused.length === 0 ? 0 : 1;
};
