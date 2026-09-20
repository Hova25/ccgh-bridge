---
title: The remaining skills
order: 2
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The remaining skills

Carry the other seven across: `open-iteration`, `write-brainstorm`, `decompose-into-tasks`,
`validate-iteration`, `launch-iteration`, `ship-iteration`, `open-fix`. The work is
mechanical and its verdict is already written — the test from task 1 fails for every skill
that still names a `pnpm --filter` call or a path from the repository they came from.

The substitution is not one-for-one. Three commands become `ccgh`; one names a documentation
server that does not exist yet; and the paths do not become other paths, because a skill that
repeats the content directory is a second place for the convention to be wrong.

**Files**

- Create: `skills/open-iteration/SKILL.md`, `skills/write-brainstorm/SKILL.md`, `skills/decompose-into-tasks/SKILL.md`, `skills/validate-iteration/SKILL.md`, `skills/launch-iteration/SKILL.md`, `skills/ship-iteration/SKILL.md`, `skills/open-fix/SKILL.md`
- Test: `tests/plugin.test.ts` — extended with the expected set

**Interfaces**

- Consumes: `tests/plugin.test.ts` and the manifest from task 1.
- Produces: the eight skills, answering as `/ccgh:<name>`. Tasks 3 to 6 do not depend on them; task 6 uses them as its proof.

- [ ] **Write the failing test**

Add to `tests/plugin.test.ts`, inside `describe("every skill")`:

```ts
  it("is one of the eight, and all eight are here", async () => {
    expect(await skills()).toEqual([
      "decompose-into-tasks",
      "launch-iteration",
      "open-fix",
      "open-iteration",
      "ship-iteration",
      "validate-iteration",
      "write-brainstorm",
      "write-spec",
    ]);
  });
```

- [ ] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

It fails on the set, and it will fail again on the `pnpm --filter` assertion as each skill
lands until its call sites are rewritten.

- [ ] **Write the implementation**

Copy each skill from the origin and apply the substitutions:

| Was | Becomes |
| --- | --- |
| `pnpm --filter <app> validate` | `ccgh validate` |
| `pnpm --filter <app> scaffold iteration\|fix\|task …` | `ccgh scaffold …` |
| `pnpm --filter <app> iteration:promote <ref> --to <status>` | `ccgh promote <ref> --to <status>` |
| `pnpm --filter <app> dev --host … --port 4322` | `ccgh docs`, with a sentence saying it does not exist yet |
| `ls <app>/src/content` | list the content directory, which is `docs/ccgh-bridge/` unless `ccgh.json` says otherwise |
| a written-out path to a `spec.md`, `brainstorm.md` or task file | the path `ccgh scaffold` printed |

`open-iteration` is the one to read twice. It names the content directory, the worktree
convention, the documentation server and the port, and it is the skill a newcomer meets
first. Its step 8 becomes a statement that the site is not built yet, and its step 9 drops
the URL; both come back in the iteration that builds the site.

`ship-iteration` and `launch-iteration` speak about GitHub Actions that a consuming
repository does not have yet. They keep saying what the bridge does, because that is what
they are for, and say plainly that `ccgh init` writes those workflows — which is true, in
the iteration that adds it.

Nothing else changes. A skill rewritten while being moved is a skill nobody reviewed.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then load the plugin and read the two longest as Claude receives them:

```bash
claude --plugin-dir .
```

`/help` lists eight under `ccgh`. `/ccgh:open-iteration` and `/ccgh:ship-iteration` name only
commands that exist, or say which do not.

- [ ] **Commit**
