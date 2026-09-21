---
title: The pages workflow
order: 2
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The pages workflow

A sixth template, and the first one `ccgh init` does not always write. A repository that has
not said where it publishes does not want a workflow that publishes, and `ccgh docs --build`
already refuses without `site` — so writing the workflow for such a repository would produce a
job that can only fail.

After this, the content tree of this repository can be read by someone who has installed
nothing, which is the only deliverable here that needs no explanation.

**Files**

- Create: `src/workflows/optional/ccgh-pages.yml`
- Modify: `src/commands/init.ts` — the conditional template
- Modify: `src/commands/init.test.ts`
- Create: `.github/workflows/ccgh-pages.yml` — by running it here

**Interfaces**

- Consumes: `configuration` and the template mechanism from the bridge iteration.
- Produces: a published site at the `site` in `ccgh.json`. Task 6 links to it.

- [x] **Write the failing test**

```ts
it("writes no pages workflow for a repository that has not said where it publishes", async () => {
  await run({ argv: [], cwd: root });

  expect(await readdir(join(root, workflows))).not.toContain("ccgh-pages.yml");
});

it("writes one when it has", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "site": "https://x.github.io/repo" }', "utf8");

  await run({ argv: [], cwd: root });

  expect(await readdir(join(root, workflows))).toContain("ccgh-pages.yml");
});

it("removes it again when the key goes away, rather than leaving a job that can only fail", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "site": "https://x.github.io/repo" }', "utf8");
  await run({ argv: [], cwd: root });

  await writeFile(join(root, "ccgh.json"), "{}", "utf8");
  await run({ argv: [], cwd: root });

  expect(await readdir(join(root, workflows))).not.toContain("ccgh-pages.yml");
});
```

The third is the one that would otherwise be forgotten. `init` owns the file — its marker says
so — and owning it means removing it when its reason is gone.

- [x] **Run it to verify it fails**

```bash
bun test src/commands/init.test.ts
```

- [x] **Write the implementation**

The templates directory gains an `optional/` beside the five, so that "written when a
condition holds" is visible in the layout rather than in a list inside the command.

`ccgh-pages.yml` checks out, runs `ccgh docs --build` through the action, uploads
`.ccgh/site`, and deploys. `pages: write` and `id-token: write`, one concurrency group, and
`workflow_dispatch` beside the push trigger so that a first deployment does not need a commit.

`init` writes it when `configuration().site` is set, and deletes it — only if it carries the
marker — when it is not.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then here:

```bash
./bin/ccgh init --from ./
```

Enable Pages for the repository, with GitHub Actions as the source, and let it deploy. Then
open the published URL and follow the tree: the base is what a published site gets wrong, and
the site iteration's last task exists because that failure is invisible locally.

- [x] **Commit**
