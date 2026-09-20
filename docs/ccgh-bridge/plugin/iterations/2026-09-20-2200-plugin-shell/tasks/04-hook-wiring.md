---
title: Hook wiring
order: 4
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Hook wiring

Give the eight rules a way to be called. One entry point reads the tool call from standard
input, dispatches to the rule named on its command line, and exits 0 or 2; `hooks/hooks.json`
registers it ten times, once per rule per event it watches.

The origin had a wrapper file per rule, each four lines long. Eight files that differ by one
import is eight places for the list to drift from the list in the settings, so the wrappers
become one file taking the rule as an argument.

After this task, committing on `main` in this repository is refused when the plugin is
loaded. That is the first time anything in this repository is enforced rather than intended.

**Files**

- Create: `hooks/run.ts`
- Create: `hooks/hooks.json`
- Create: `hooks/shell.ts`
- Test: `hooks/run.test.ts`

**Interfaces**

- Consumes: every `decide` from task 3, and the `Context` type from `hooks/context.ts`.
- Produces: `bun "${CLAUDE_PLUGIN_ROOT}/hooks/run.ts" <rule>`, the command `hooks.json` registers; and `hooks/shell.ts`, the real `Context` — `currentBranch`, `stagedFiles`, `check` and `project`, the last reading `CLAUDE_PROJECT_DIR` and falling back to the working directory.

- [x] **Write the failing test**

`hooks/run.test.ts` runs the entry point as a process, because what is being tested is the
exit code a hook produces and nothing else can observe it:

```ts
import { describe, expect, it } from "bun:test";

const entry = new URL("./run.ts", import.meta.url).pathname;

const invoke = async ({ rule, input }: { rule: string; input: unknown }) => {
  const child = Bun.spawn(["bun", entry, rule], { stdin: "pipe", stderr: "pipe" });

  child.stdin.write(JSON.stringify(input));
  await child.stdin.end();

  return { code: await child.exited, stderr: await new Response(child.stderr).text() };
};

describe("the hook entry point", () => {
  it("refuses with exit 2 and says why", async () => {
    const { code, stderr } = await invoke({
      rule: "enforce-language",
      input: { tool_input: { file_path: "a.md", content: "Ceci est une phrase avec des mots." } },
    });

    expect(code).toBe(2);
    expect(stderr).not.toBe("");
  });

  it("allows with exit 0 and says nothing", async () => {
    const { code, stderr } = await invoke({
      rule: "enforce-language",
      input: { tool_input: { file_path: "a.md", content: "This is an ordinary sentence." } },
    });

    expect(code).toBe(0);
    expect(stderr).toBe("");
  });

  it("refuses rather than allows when the rule name is unknown", async () => {
    const { code } = await invoke({ rule: "no-such-rule", input: {} });

    expect(code).toBe(2);
  });

  it("refuses rather than allows when the input is not JSON", async () => {
    const child = Bun.spawn(["bun", entry, "protect-main-branch"], { stdin: "pipe", stderr: "pipe" });

    child.stdin.write("{ not json");
    await child.stdin.end();

    expect(await child.exited).toBe(2);
  });
});
```

The last two are the ones worth having. A hook that fails open is worse than no hook, because
it is believed.

- [x] **Run it to verify it fails**

```bash
bun test hooks/run.test.ts
```

- [x] **Write the implementation**

`hooks/run.ts` keeps both shapes the origin had: a refusal exits 2 with the reason on stderr,
and a rule that asks rather than refuses writes the `permissionDecision: "ask"` payload and
exits 0. `require-decision-notice` is the only rule that asks.

`hooks/hooks.json` registers the rules against the events they watch:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" protect-main-branch" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" enforce-iteration-isolation" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" require-a-home" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" enforce-language" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" require-decision-notice" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" refuse-bash-writes-to-content" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" check-staged-files" }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" protect-generated-frontmatter" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" enforce-language" },
          { "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/run.ts\" require-decision-notice" }
        ]
      }
    ]
  }
}
```

Add to `tests/plugin.test.ts` an assertion that every rule file under `hooks/rules/` appears
in `hooks.json`, and that every command named there resolves to a file. A rule nobody
registers is a rule nobody runs, and it looks exactly like a rule that passes.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then load the plugin and try the thing it is supposed to refuse. This is the acceptance
criterion of the task, and it cannot be reached from the test suite:

```bash
claude --plugin-dir .
```

In that session, on `main`, ask for a commit. It is refused, and the reason names the branch.

- [x] **Commit**
