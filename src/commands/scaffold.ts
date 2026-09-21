import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DATED_PREFIX, SLUG } from "../model/schemas";
import { contentRoot } from "../project";

export type Scaffold = { file: string; content: string };

const slugPattern = new RegExp(`^${SLUG}$`);
const prefixPattern = new RegExp(`^${DATED_PREFIX}$`);

export const prefixAt = ({ now }: { now: Date }): string => {
  const iso = now.toISOString();

  return `${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}`;
};

const dayOf = ({ now }: { now: Date }): string => now.toISOString().slice(0, 10);

const frontMatter = (lines: string[]): string => ["---", ...lines, "---", ""].join("\n");

const titleFrom = (slug: string): string => {
  const words = slug.split("-").join(" ");

  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const iterationName = ({
  slug,
  prefix,
  taken,
}: {
  slug: string;
  prefix: string;
  taken: string[];
}): string => {
  const first = `${prefix}-${slug}`;

  if (!taken.includes(first)) return first;

  let suffix = 2;
  while (taken.includes(`${first}-${suffix}`)) suffix += 1;

  return `${first}-${suffix}`;
};

export const domainScaffold = ({
  domain,
}: {
  domain: string;
}): { reference: string; files: Scaffold[] } => {
  if (!slugPattern.test(domain)) throw new Error(`domain must be a slug, got ${domain}`);

  const title = titleFrom(domain);

  return {
    reference: domain,
    files: [
      {
        file: `${domain}/index.md`,
        content:
          frontMatter([
            `title: ${title}`,
            "summary: <One sentence naming what this domain owns, read on the site's front page.>",
          ]) +
          [
            "",
            "<What this domain covers and where its code lives, so that the next change can tell",
            "whether it belongs here.>",
            "",
          ].join("\n"),
      },
    ],
  };
};

export const iterationScaffold = ({
  domain,
  slug,
  now,
  prefix,
  taken = [],
  author,
}: {
  domain: string;
  slug: string;
  now: Date;
  prefix?: string;
  taken?: string[];
  author: string;
}): { reference: string; files: Scaffold[] } => {
  if (!slugPattern.test(domain)) throw new Error(`domain must be a slug, got ${domain}`);
  if (!slugPattern.test(slug)) throw new Error(`slug must be a slug, got ${slug}`);

  const iteration = iterationName({ slug, prefix: prefix ?? prefixAt({ now }), taken });
  const directory = `${domain}/iterations/${iteration}`;
  const title = titleFrom(slug);

  return {
    reference: `${domain}/${iteration}`,
    files: [
      {
        file: `${directory}/brainstorm.md`,
        content:
          frontMatter([
            `title: ${title}`,
            `date: ${dayOf({ now })}`,
            "participants:",
            `  - ${author}`,
          ]) +
          [
            "",
            `# ${title}`,
            "",
            "## What prompted this",
            "",
            "<What is wrong today, and what made it worth doing now.>",
            "",
            "## What was considered",
            "",
            "<Two or three approaches, each with what it costs. Say which was chosen and why the",
            "others were not.>",
            "",
            "## Not settled here",
            "",
            "<What is deliberately left open, so a reader does not mistake it for an oversight.>",
            "",
          ].join("\n"),
      },
      {
        file: `${directory}/spec.md`,
        content:
          frontMatter([`title: ${title}`, "status: draft", "depends_on: []", "impacts: []"]) +
          [
            "",
            `# ${title}`,
            "",
            "## Problem",
            "",
            "<What is broken or missing, with evidence rather than assertion.>",
            "",
            "## Goals",
            "",
            "<What is true when this ships.>",
            "",
            "## Non-goals",
            "",
            "<What this deliberately does not do, and why.>",
            "",
            "## Contract",
            "",
            "<The shapes, paths and commands involved.>",
            "",
            "## Failure modes",
            "",
            "<What goes wrong, and what happens when it does.>",
            "",
            "## Risks",
            "",
            "<The weaknesses of the chosen design, stated honestly.>",
            "",
            "## Open questions",
            "",
            "<None blocking, or what must be answered before launching.>",
            "",
          ].join("\n"),
      },
    ],
  };
};

export const fixScaffold = ({
  domain,
  slug,
  now,
}: {
  domain: string;
  slug: string;
  now: Date;
}): { reference: string; files: Scaffold[] } => {
  if (!slugPattern.test(domain)) throw new Error(`domain must be a slug, got ${domain}`);
  if (!slugPattern.test(slug)) throw new Error(`slug must be a slug, got ${slug}`);

  const name = `${prefixAt({ now })}-${slug}`;
  const title = titleFrom(slug);

  return {
    reference: `${domain}/fixes/${name}`,
    files: [
      {
        file: `${domain}/fixes/${name}.md`,
        content:
          frontMatter([`title: ${title}`, `date: ${dayOf({ now })}`, "issue: null", "pr: null"]) +
          [
            "",
            `# ${title}`,
            "",
            "<One paragraph: what was wrong. This becomes the body of the GitHub issue, so it is",
            "read by someone who has read nothing else.>",
            "",
            "<Then what changed, and anything a reader would otherwise have to discover.>",
            "",
          ].join("\n"),
      },
    ],
  };
};

export const taskScaffold = ({
  reference,
  slug,
  order,
}: {
  reference: string;
  slug: string;
  order: number;
}): Scaffold => {
  if (!slugPattern.test(slug)) throw new Error(`slug must be a slug, got ${slug}`);

  const [domain, iteration] = reference.split("/");
  const title = titleFrom(slug);
  const prefix = String(order).padStart(2, "0");

  return {
    file: `${domain}/iterations/${iteration}/tasks/${prefix}-${slug}.md`,
    content:
      frontMatter([
        `title: ${title}`,
        `order: ${order}`,
        "issue: null",
        "github:",
        "  state: null",
        "  pr: null",
        "  merged_at: null",
        "  synced_at: null",
      ]) +
      [
        "",
        `# ${title}`,
        "",
        "<One paragraph saying what this task delivers and why it is a task of its own. This",
        "becomes the first thing an issue shows.>",
        "",
        "**Files**",
        "",
        "- Create: `<path>`",
        "- Test: `<path>`",
        "",
        "**Interfaces**",
        "",
        "- Consumes: <what earlier tasks produced, with exact names>",
        "- Produces: <what later tasks rely on, with exact signatures>",
        "",
        "- [ ] **Write the failing test**",
        "",
        "- [ ] **Run it to verify it fails**",
        "",
        "- [ ] **Write the implementation**",
        "",
        "- [ ] **Run the tests to verify they pass**",
        "",
        "- [ ] **Commit**",
        "",
      ].join("\n"),
  };
};

const write = async ({ root, files }: { root: string; files: Scaffold[] }): Promise<void> => {
  for (const { file } of files) {
    if (existsSync(join(root, file)))
      throw new Error(`${file} already exists; refusing to overwrite it`);
  }

  for (const { file, content } of files) {
    const path = join(root, file);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    process.stdout.write(`${file}\n`);
  }
};

const existingIterations = async ({
  root,
  domain,
}: {
  root: string;
  domain: string;
}): Promise<string[]> => {
  try {
    return await readdir(join(root, domain, "iterations"));
  } catch {
    return [];
  }
};

const nextOrder = async ({
  root,
  reference,
}: {
  root: string;
  reference: string;
}): Promise<number> => {
  const [domain, iteration] = reference.split("/");

  try {
    const files = await readdir(join(root, `${domain}/iterations/${iteration}/tasks`));

    return files.filter((name) => name.endsWith(".md")).length + 1;
  } catch {
    return 1;
  }
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const root = contentRoot({ from: cwd });
  const [kind, target, slug] = argv;
  const now = new Date();
  const at = argv.includes("--at") ? argv[argv.indexOf("--at") + 1] : undefined;

  try {
    if (argv.includes("--at") && (at === undefined || !prefixPattern.test(at))) {
      throw new Error(`--at takes a prefix shaped yyyy-mm-dd-HHMM, got ${at ?? "nothing"}`);
    }

    if (kind === "iteration" && target) {
      const [domain = "", name = ""] = target.split("/");
      const taken = await existingIterations({ root, domain });

      // A prefix given by the caller names a worktree that already exists: suffixing it would
      // write an iteration the branch does not name.
      if (at !== undefined && taken.includes(`${at}-${name}`)) {
        throw new Error(`${domain}/${at}-${name} already exists; refusing to overwrite it`);
      }

      const plan = iterationScaffold({
        domain,
        slug: name,
        now,
        prefix: at,
        taken,
        author: process.env.USER ?? "unknown",
      });

      await write({ root, files: plan.files });
      process.stdout.write(`\n${plan.reference}\n`);

      return 0;
    }

    if (kind === "domain" && target) {
      const plan = domainScaffold({ domain: target });

      await write({ root, files: plan.files });
      process.stdout.write(`\n${plan.reference}\n`);

      return 0;
    }

    if (kind === "fix" && target) {
      const [domain = "", name = ""] = target.split("/");
      const plan = fixScaffold({ domain, slug: name, now });

      await write({ root, files: plan.files });
      process.stdout.write(`\n${plan.reference}\n`);

      return 0;
    }

    if (kind === "task" && target && slug) {
      const order = await nextOrder({ root, reference: target });

      await write({ root, files: [taskScaffold({ reference: target, slug, order })] });

      return 0;
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);

    return 1;
  }

  process.stderr.write(
    [
      "usage:",
      "  ccgh scaffold domain <name>",
      "  ccgh scaffold iteration <domain>/<slug> [--at yyyy-mm-dd-HHMM]",
      "  ccgh scaffold fix <domain>/<slug>",
      "  ccgh scaffold task <domain>/<iteration> <slug>",
      "",
    ].join("\n"),
  );

  return 1;
};
