---
title: Adoption
order: 10
issue: 43
github:
  state: null
  pr: 65
  merged_at: '2026-09-21T00:08:24Z'
  synced_at: '2026-09-21T00:08:37.865Z'
---

# Adoption

Turn it on here, and let it do what it was built for: check this repository's `main` against
its own rules for the first time, and move three specifications that have been stuck since the
day they were written.

Every iteration so far has ended by adopting what it built. This one ends by letting the thing
it built judge everything that came before it.

**Files**

- Modify: `.github/workflows/*` — the five, written by `ccgh init --from ./`
- Modify: `README.md` — the status, `ccgh init`, `ccgh bridge`
- Modify: three specifications — by the bridge, not by hand

**Interfaces**

- Consumes: everything tasks 1 to 9 produced.
- Produces: nothing new. The iteration ends here.

- [x] **Write the failing test**

The assertion is about this repository rather than the code, and it belongs with the others
that guard the plugin:

```ts
it("carries the workflows ccgh init writes, pointed at itself", async () => {
  const workflows = (await readdir(join(root, ".github/workflows"))).sort();

  expect(workflows).toContain("ccgh-validate.yml");

  for (const name of workflows.filter((file) => file.startsWith("ccgh-"))) {
    const body = await readFile(join(root, ".github/workflows", name), "utf8");

    expect(body, name).toContain("uses: ./");
    expect(body, name).not.toMatch(/uses:\s*[\w-]+\/ccgh-bridge@/);
  }
});
```

- [x] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

- [x] **Write the implementation**

```bash
./bin/ccgh init --from ./
```

Read the diff before committing it. Then push, and read the run — this is the first pull
request in this repository's history that is checked by anything other than a local command.

If `main` does not pass its own validation, stop and say exactly what failed. Fixing it is a
fix record, not a quiet edit inside this task: twenty-three pull requests merged without a
check, and whatever that let through deserves its own name.

Then let the bridge move what is stuck. With a token, from a terminal, dry run first:

```bash
GITHUB_TOKEN=… ./bin/ccgh bridge reconcile --dry-run
```

`engine/bootstrap` shipped a day ago and is still `draft`; two more are `ready`. Promoting them
to `active` is what creates their issues, and closing those issues is what makes them
`shipped`. Do it one iteration at a time and show the plan before each.

The README stops saying the bridge is not built, and gains `ccgh init` and `ccgh bridge`.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

And the real one: a green `ccgh-validate` on a pull request, an issue in this repository created
by the bridge rather than by hand, and a specification reaching `shipped` without anyone typing
the word.

- [x] **Commit**
