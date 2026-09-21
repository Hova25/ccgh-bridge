---
title: The domain scaffold
order: 2
issue: 118
github:
  state: open
  pr: 123
  merged_at: '2026-09-21T20:18:49Z'
  synced_at: '2026-09-21T20:37:18.923Z'
---

# The domain scaffold

Give the assistant a command to create a domain, and a way to scaffold an iteration inside a
worktree that already exists. Today a domain is created by hand, and `ccgh scaffold iteration`
reads the clock itself, so the skill `open-iteration` has to scaffold in the clone before the
worktree named after the reference can exist. `ccgh scaffold domain <name>` writes a domain's
`index.md`; `ccgh scaffold iteration <domain>/<slug> --at <prefix>` takes the prefix instead of
reading it. Both are engine commands with no knowledge of the lifecycle, which is why they are a
task of their own ahead of the skills that use them.

**Files**

- Modify: `src/commands/scaffold.ts` — `domainScaffold`, the `domain` kind, and `--at`
- Test: `src/commands/scaffold.test.ts`

**Interfaces**

- Consumes: nothing.
- Produces:
  - `domainScaffold({ domain }: { domain: string }): { reference: string; files: Scaffold[] }`,
    writing `<domain>/index.md`.
  - `ccgh scaffold domain <name>`: prints the file written, then the domain; exits 1 on a name
    that is not a slug or a domain whose `index.md` exists.
  - `ccgh scaffold iteration <domain>/<slug> --at <yyyy-mm-dd-HHMM>`: the reference is
    `<domain>/<prefix>-<slug>`; exits 1 on a prefix of another shape, or when that iteration
    exists, rather than suffixing it.
  - Task 5 names both commands in the skills and in the `CLAUDE.md` block.

- [x] **Write the failing test**

In `src/commands/scaffold.test.ts`, import `domainScaffold` and add:

```ts
describe("domainScaffold", () => {
  const plan = domainScaffold({ domain: "listings" });

  it("writes the domain's index, and nothing else", () => {
    expect(plan.reference).toBe("listings");
    expect(plan.files.map((file) => file.file)).toEqual(["listings/index.md"]);
  });

  it("carries the title and the summary the schema demands", () => {
    const [index] = plan.files;

    expect(index?.content).toMatch(/^---\ntitle: Listings\nsummary: .+\n---\n/);
  });

  it("refuses a name that is not a slug", () => {
    expect(() => domainScaffold({ domain: "Listings" })).toThrow(/slug/);
  });
});
```

and, inside `describe("ccgh scaffold", …)`:

```ts
it("creates a domain, and the content directory when it is missing", async () => {
  await rm(join(root, content), { recursive: true });

  expect(await run({ argv: ["domain", "listings"], cwd: root })).toBe(0);
  expect(await readdir(join(root, content))).toEqual(["listings"]);
});

it("refuses a domain that exists", async () => {
  await run({ argv: ["domain", "listings"], cwd: root });

  expect(await run({ argv: ["domain", "listings"], cwd: root })).toBe(1);
});

it("scaffolds an iteration at the prefix it is given", async () => {
  expect(await run({ argv: ["iteration", "engine/probe", "--at", "2026-09-14-1703"], cwd: root })).toBe(0);
  expect(await readdir(join(root, content, "engine", "iterations"))).toEqual([
    "2026-09-14-1703-probe",
  ]);
});

it("refuses a prefix it is given when that iteration exists, rather than suffixing it", async () => {
  const argv = ["iteration", "engine/probe", "--at", "2026-09-14-1703"];

  await run({ argv, cwd: root });

  expect(await run({ argv, cwd: root })).toBe(1);
});

it("refuses a prefix of another shape", async () => {
  expect(await run({ argv: ["iteration", "engine/probe", "--at", "2026-09-14"], cwd: root })).toBe(1);
});
```

- [x] **Run it to verify it fails**

```bash
bun test src/commands/scaffold.test.ts
```

`domainScaffold` does not exist, and `run` knows neither `domain` nor `--at`.

- [x] **Write the implementation**

In `src/commands/scaffold.ts`, import `DATED_PREFIX` from `../model/schemas` beside `SLUG`, then
add:

```ts
const prefixPattern = new RegExp(`^${DATED_PREFIX}$`);

export const domainScaffold = ({ domain }: { domain: string }): { reference: string; files: Scaffold[] } => {
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
```

In `run`, read `--at` before dispatching, and pass the prefix through:

```ts
const at = argv.includes("--at") ? argv[argv.indexOf("--at") + 1] : undefined;

if (at !== undefined && !prefixPattern.test(at)) {
  throw new Error(`--at takes a prefix shaped yyyy-mm-dd-HHMM, got ${at}`);
}
```

The iteration branch becomes:

```ts
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
```

`iterationScaffold` takes an optional `prefix?: string` and uses
`prefix ?? prefixAt({ now })` where it read `prefixAt({ now })`. Add the domain branch:

```ts
if (kind === "domain" && target) {
  const plan = domainScaffold({ domain: target });

  await write({ root, files: plan.files });
  process.stdout.write(`\n${plan.reference}\n`);

  return 0;
}
```

The `--at` check sits inside the existing `try`, so its message reaches stderr with exit 1.
The usage text gains `  ccgh scaffold domain <name>` and
`  ccgh scaffold iteration <domain>/<slug> [--at yyyy-mm-dd-HHMM]`. `write` already refuses an
existing file and creates missing directories, which covers both refusals and the missing
content directory.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**

```bash
git add src/commands/scaffold.ts src/commands/scaffold.test.ts
git commit -m "Scaffold a domain, and an iteration at a given prefix"
```
