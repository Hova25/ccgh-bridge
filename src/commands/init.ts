import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { configuration } from "../configuration";
import { contentRoot, repositoryRoot } from "../project";

// Ownership is a line rather than a manifest: a manifest is one more file to go stale, and a
// marker travels with the thing it marks.
const marker = "# written by ccgh init; edits are overwritten";

const templates = fileURLToPath(new URL("../workflows", import.meta.url));

// Beside the five rather than among them, so that "written when a condition holds" is visible
// in the layout instead of hiding in a list inside this command.
const optional = join(templates, "optional");

const defaultAction = "Hova25/ccgh-bridge@v1";

// CLAUDE.md is shared with the repository's own instructions, so ownership is a delimited block
// rather than the whole file: everything outside the markers is never touched.
const begin = "<!-- ccgh:begin — written by ccgh init; edits inside are overwritten -->";
const beginPrefix = "<!-- ccgh:begin";
const end = "<!-- ccgh:end -->";

const instructionsTemplate = fileURLToPath(new URL("../templates/claude-md.md", import.meta.url));

const writeInstructions = async ({
  repository,
  cwd,
}: {
  repository: string;
  cwd: string;
}): Promise<boolean> => {
  const file = join(repository, "CLAUDE.md");
  const content = relative(repository, contentRoot({ from: cwd }))
    .split(sep)
    .join("/");
  const template = await readFile(instructionsTemplate, "utf8");
  const block = `${begin}\n\n${template.replaceAll("__CONTENT__", content).trimEnd()}\n\n${end}`;

  if (!existsSync(file)) {
    await writeFile(file, `${block}\n`, "utf8");
    return true;
  }

  const existing = await readFile(file, "utf8");
  const start = existing.indexOf(beginPrefix);

  if (start === -1) {
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    await writeFile(file, `${existing}${separator}${block}\n`, "utf8");
    return true;
  }

  const stop = existing.indexOf(end, start);

  // Replacing up to the end of the file would delete whatever the repository wrote after it.
  if (stop === -1) return false;

  const updated = `${existing.slice(0, start)}${block}${existing.slice(stop + end.length)}`;

  if (updated !== existing) await writeFile(file, updated, "utf8");

  return true;
};

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
  const wanted = new Map<string, boolean>([["ccgh-pages.yml", Boolean(settings.site)]]);
  const names = [
    ...(await readdir(templates)).filter((name) => name.endsWith(".yml")),
    ...(await readdir(optional)),
  ].sort();

  for (const name of names) {
    const source = existsSync(join(templates, name)) ? templates : optional;

    // A repository that has not said where it publishes does not want a workflow that
    // publishes: `ccgh docs --build` refuses without `site`, so the job could only fail.
    if (wanted.get(name) === false) {
      const destination = join(directory, name);

      if (existsSync(destination)) {
        const existing = await readFile(destination, "utf8");

        if (existing.startsWith(marker)) await rm(destination);
      }

      continue;
    }

    const destination = join(directory, name);

    if (existsSync(destination)) {
      const existing = await readFile(destination, "utf8");

      if (!existing.startsWith(marker)) {
        refused.push(name);
        continue;
      }
    }

    let body = (await readFile(join(source, name), "utf8")).replaceAll("__ACTION__", action);

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

  // Only when it has something to change: rewriting a file it did not change reformats it,
  // and a repository whose formatter disagrees then fails its own lint for no reason.
  if (current.action !== action) {
    await writeFile(file, `${JSON.stringify({ ...current, action }, null, 2)}\n`, "utf8");
  }

  for (const name of refused) {
    process.stderr.write(`refusing ${name}: it was not written by ccgh init\n`);
  }

  const instructed = await writeInstructions({ repository, cwd });

  if (!instructed) {
    process.stderr.write(`refusing CLAUDE.md: its ccgh block has no ${end} line\n`);
  }

  const written = names.filter((name) => wanted.get(name) !== false).length - refused.length;

  process.stdout.write(`${written} workflow(s) written, pointing at ${action}\n`);

  if (instructed) process.stdout.write("CLAUDE.md carries the ccgh lifecycle\n");

  return refused.length === 0 && instructed ? 0 : 1;
};
