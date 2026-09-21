import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { configuration } from "../configuration";
import { packageManagerOf } from "../package-manager";
import { contentDirectory, contentRoot, repositoryRoot } from "../project";
import { adoptionContent, checkProposal } from "./adoption";

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

const nodeVersion = ({ repository }: { repository: string }): string => {
  const file = [".nvmrc", ".node-version"].find((name) => existsSync(join(repository, name)));

  return file ? `node-version-file: ${file}` : "node-version: lts/*";
};

const setupNode = ({ repository, cache }: { repository: string; cache?: string }): string[] => [
  "      - uses: actions/setup-node@v4",
  "        with:",
  `          ${nodeVersion({ repository })}`,
  ...(cache ? [`          cache: ${cache}`] : []),
];

const declaresPackageManager = ({ repository }: { repository: string }): boolean => {
  const manifest = join(repository, "package.json");

  if (!existsSync(manifest)) return false;

  return typeof JSON.parse(readFileSync(manifest, "utf8")).packageManager === "string";
};

// The lockfile names the package manager, and installing with any other one either fails on
// the frozen lockfile or resolves different versions than the ones the repository tested.
const installSteps = ({ repository }: { repository: string }): string[][] => {
  const has = (name: string) => existsSync(join(repository, name));
  const manager = packageManagerOf({ repository });

  if (manager === "bun") {
    return [["      - uses: oven-sh/setup-bun@v2"], ["      - run: bun install --frozen-lockfile"]];
  }

  if (manager === "pnpm") {
    // pnpm/action-setup refuses to guess a version unless package.json declares one.
    const version = declaresPackageManager({ repository })
      ? []
      : ["        with:", "          version: latest"];

    return [
      ["      - uses: pnpm/action-setup@v4", ...version],
      setupNode({ repository, cache: "pnpm" }),
      ["      - run: pnpm install --frozen-lockfile"],
    ];
  }

  // Yarn 2 and later is fetched by corepack, and the cache option would ask Yarn 1 for its
  // cache directory before corepack has replaced it.
  if (manager === "yarn" && has(".yarnrc.yml")) {
    return [
      setupNode({ repository }),
      ["      - run: corepack enable"],
      ["      - run: yarn install --immutable"],
    ];
  }

  if (manager === "yarn") {
    return [
      setupNode({ repository, cache: "yarn" }),
      ["      - run: yarn install --frozen-lockfile"],
    ];
  }

  if (manager === "npm" && (has("package-lock.json") || has("npm-shrinkwrap.json"))) {
    return [setupNode({ repository, cache: "npm" }), ["      - run: npm ci"]];
  }

  if (manager === "npm") return [setupNode({ repository }), ["      - run: npm install"]];

  return [];
};

// A repository's own checks are its own: the commands come from `check` in ccgh.json, and the
// toolchain they need is inferred from what the repository looks like. This is the one part of
// the generated workflow that cannot be the same everywhere.
const checkSteps = ({
  commands,
  repository,
}: {
  commands: string[];
  repository: string;
}): string => {
  if (commands.length === 0) return "";

  const steps = [
    ...installSteps({ repository }),
    ...commands.map((command) => [`      - run: ${command}`]),
  ];

  return steps.map((lines) => `\n${lines.join("\n")}`).join("\n");
};

const install = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
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
        repository,
      });
    }

    await writeFile(destination, `${marker}\n${body}`, "utf8");
  }

  const file = join(repository, "ccgh.json");
  const current = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
  const next = {
    ...current,
    action,
    // Written rather than implied, so that a repository reads the setting it runs with.
    language: current.language ?? { refuse: [] },
  };

  // Only when it has something to change: rewriting a file it did not change reformats it,
  // and a repository whose formatter disagrees then fails its own lint for no reason.
  if (current.action !== action || current.language === undefined) {
    await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
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

const git = ({ cwd, args }: { cwd: string; args: string[] }): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const succeeds = ({ cwd, args }: { cwd: string; args: string[] }): boolean => {
  try {
    git({ cwd, args });

    return true;
  } catch {
    return false;
  }
};

// Everything checked before anything is written: a refusal leaves the repository untouched.
const adoptionRefusal = ({
  repository,
  branch,
  worktree,
}: {
  repository: string;
  branch: string;
  worktree: string;
}): string | null => {
  if (!succeeds({ cwd: repository, args: ["rev-parse", "--verify", "HEAD"] })) {
    return "the repository has no commit yet; commit something to main first";
  }

  const current = git({ cwd: repository, args: ["rev-parse", "--abbrev-ref", "HEAD"] });

  if (current !== "main") return `the clone is on ${current}; run ccgh init from main`;

  if (git({ cwd: repository, args: ["status", "--porcelain"] }) !== "") {
    return "the clone has changes in progress; commit or remove them first";
  }

  const taken = ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`];

  if (succeeds({ cwd: repository, args: taken })) return `the branch ${branch} already exists`;

  if (existsSync(worktree)) return `${worktree} already exists`;

  return null;
};

const adopt = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const repository = repositoryRoot({ from: cwd });
  const content = contentDirectory({ from: repository });
  const plan = adoptionContent({ now: new Date(), proposal: checkProposal({ repository }) });
  const branch = plan.reference;
  const worktree = resolve(repository, "..", "worktrees", branch.replace("/", "-"));
  const refusal = adoptionRefusal({ repository, branch, worktree });

  if (refusal) {
    process.stderr.write(`refusing to adopt: ${refusal}\n`);

    return 1;
  }

  await mkdir(dirname(worktree), { recursive: true });
  git({ cwd: repository, args: ["worktree", "add", "-q", worktree, "-b", branch, "main"] });

  try {
    if ((await install({ argv, cwd: worktree })) !== 0) {
      throw new Error("writing the workflows or CLAUDE.md was refused");
    }

    for (const { file, content: text } of plan.files) {
      const path = join(worktree, content, file);

      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, text, "utf8");
    }

    git({ cwd: worktree, args: ["add", "-A"] });
    git({ cwd: worktree, args: ["commit", "-q", "-m", "Adopt ccgh"] });
  } catch (error) {
    // Half an adoption is worse than none: the next run would refuse the names it left behind.
    succeeds({ cwd: repository, args: ["worktree", "remove", "--force", worktree] });
    succeeds({ cwd: repository, args: ["branch", "-D", branch] });
    process.stderr.write(`adoption abandoned: ${(error as Error).message}\n`);

    return 1;
  }

  process.stdout.write(
    [
      `adopted on ${branch}, in ${worktree}`,
      "",
      "Next:",
      `/ccgh:validate-iteration ${branch}`,
      "",
    ].join("\n"),
  );

  return 0;
};

// A repository with no content has not adopted ccgh yet: adopting it is a branch of its own,
// not files left on main.
export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> =>
  existsSync(contentRoot({ from: cwd })) ? install({ argv, cwd }) : adopt({ argv, cwd });
