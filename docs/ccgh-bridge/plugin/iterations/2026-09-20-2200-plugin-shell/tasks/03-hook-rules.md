---
title: Hook rules
order: 3
issue: 47
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Hook rules

Move the eight rules that decide what the workflow refuses, with the tests that came with
them, from `.mjs` run by node to TypeScript run by Bun. Each stays a pure function —
`decide({ input, context })` returning a refusal string or `null` — which is what lets a rule
about a `git commit` be tested without a `git commit`.

Two of them stop naming one repository. `enforce-iteration-isolation` matches
`src/content/<domain>/iterations/<…>/` in a regular expression built at module load;
`refuse-bash-writes-to-content` does the same. Both take the content root from the engine
instead, which is the fourth and last time this iteration's ancestor hunts down a hardcoded
path.

Configuration is not here. `check-staged-files` and `enforce-language` arrive with their
origin behaviour and gain their `ccgh.json` keys in task 5, so that the move and the new
behaviour are two diffs rather than one.

**Files**

- Create: `hooks/rules/protect-main-branch.ts`, `require-a-home.ts`, `enforce-iteration-isolation.ts`, `check-staged-files.ts`, `refuse-bash-writes-to-content.ts`, `require-decision-notice.ts`, `enforce-language.ts`, `protect-generated-frontmatter.ts`
- Create: `hooks/context.ts`
- Test: `hooks/rules/<each>.test.ts`

**Interfaces**

- Consumes: `contentRoot` from `src/project` and `homeOf` from `src/commands/require-a-home` (the engine); nothing from tasks 1 and 2.
- Produces: `type Decide = (input: { input: HookInput; context: Context }) => string | null`, one per rule, each exported as `decide`; and `type Context = { currentBranch: () => string; stagedFiles: () => string[]; check: (input: { files: string[] }) => string; project: () => string }` from `hooks/context.ts`, which task 4 wires to the real shell.

- [ ] **Write the failing test**

The tests come with the code. Copy the five test files the origin has —
`check-staged-files`, `enforce-iteration-isolation`, `protect-generated-frontmatter`,
`protect-main-branch`, `refuse-bash-writes-to-content`, `require-a-home` — changing only the
`vitest` import to `bun:test` and the extensions. They pass a fake `context`, so they need no
repository.

Three rules arrive without tests: `enforce-language`, `require-decision-notice` and the two
the origin tested from `.claude/tests/` rather than beside the rule. Write those beside the
rule, one assertion per refusal the rule can produce:

```ts
import { describe, expect, it } from "bun:test";
import { decide } from "./require-decision-notice";

const edit = (input: Record<string, unknown>) => ({ input: { tool_input: input } });

describe("the decision notice", () => {
  it("asks before a test file is deleted", () => {
    expect(decide(edit({ command: "rm src/thing.test.ts" }))).toMatch(/deletes a test/);
  });

  it("asks before a dependency is added", () => {
    expect(decide(edit({ file_path: "package.json", content: '{ "zod": "^4.0.0" }' }))).toMatch(
      /dependency/,
    );
  });

  it("asks before the harness changes itself", () => {
    expect(decide(edit({ file_path: "hooks/rules/protect-main-branch.ts" }))).toMatch(/harness/);
  });

  it("says nothing about ordinary work", () => {
    expect(decide(edit({ file_path: "src/model/load.ts", content: "export const x = 1;" }))).toBeNull();
  });
});
```

Add, for the two rules that lose their hardcoded path, the assertion the origin could not
write:

```ts
it("follows the repository's content root rather than one repository's", () => {
  expect(
    decide({
      input: { tool_input: { command: "git commit" } },
      context: fake({
        project: "/repo",
        staged: [
          "docs/ccgh-bridge/engine/iterations/2026-01-01-0900-a/spec.md",
          "docs/ccgh-bridge/plugin/iterations/2026-01-01-0900-b/spec.md",
        ],
      }),
    }),
  ).toMatch(/more than one iteration/);
});
```

- [ ] **Run it to verify it fails**

```bash
bun test hooks
```

- [ ] **Write the implementation**

`hooks/context.ts` declares the `Context` type and nothing else; the implementation that
shells out is task 4's. Keeping the type here is what lets every rule be tested with a fake.

Each rule is the origin's `.mjs` with types added and its module-level constants moved inside
`decide` where they depend on the content root. Nothing else changes: a logic change inside a
move of eight rules is the failure this task causes.

`require-a-home.ts` is the exception worth stating. The origin reimplemented the matching the
engine now owns; here the rule resolves the content root, calls `homeOf` from
`src/commands/require-a-home`, and refuses when it returns `null`. One definition of "has a
home", used by the hook and by the command, is what stops the two from disagreeing — which
they have, before, and it cost two red checks.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

The rules are inert until task 4 wires them. That is the point: a rule proved correct before
anything can invoke it.

- [ ] **Commit**
