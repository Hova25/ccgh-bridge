import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./run.ts", import.meta.url));

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
    const child = Bun.spawn(["bun", entry, "protect-main-branch"], {
      stdin: "pipe",
      stderr: "pipe",
    });

    child.stdin.write("{ not json");
    await child.stdin.end();

    expect(await child.exited).toBe(2);
  });

  it("asks rather than refuses for the rule that asks", async () => {
    const child = Bun.spawn(["bun", entry, "require-decision-notice"], {
      stdin: "pipe",
      stdout: "pipe",
    });

    child.stdin.write(JSON.stringify({ tool_input: { file_path: "CLAUDE.md", content: "x" } }));
    await child.stdin.end();

    const written = JSON.parse(await new Response(child.stdout).text());

    expect(await child.exited).toBe(0);
    expect(written.hookSpecificOutput.permissionDecision).toBe("ask");
  });

  it("reads a Windows path the way it reads any other", async () => {
    const { code } = await invoke({
      rule: "protect-generated-frontmatter",
      input: {
        tool_input: {
          file_path: "C:\\repo\\docs\\ccgh-bridge\\engine\\fixes\\a.md",
          content: "---\nissue: 3\n---\n",
        },
      },
    });

    expect(code).toBe(2);
  });
});
