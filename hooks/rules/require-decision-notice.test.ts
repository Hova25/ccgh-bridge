import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./require-decision-notice";

const edit = ({ file, newString }: { file: string; newString?: string }) => ({
  tool_name: "Edit",
  tool_input: { file_path: file, new_string: newString },
});

describe("require-decision-notice", () => {
  it("stays silent on ordinary application code", () => {
    expect(
      decide({
        context: fake({}),
        input: edit({ file: "src/app.ts", newString: "const total = price * quantity;" }),
      }),
    ).toBeNull();
  });

  it("asks before a dependency is added", () => {
    expect(
      decide({
        context: fake({}),
        input: edit({ file: "package.json", newString: '"lodash": "^4.17.21"' }),
      }),
    ).toMatch(/dependency/);
  });

  it("asks before the harness itself changes", () => {
    expect(
      decide({
        context: fake({}),
        input: edit({ file: ".claude/settings.json", newString: "{}" }),
      }),
    ).toMatch(/harness/);
    expect(
      decide({ context: fake({}), input: edit({ file: "CLAUDE.md", newString: "## Rules" }) }),
    ).toMatch(/harness/);
  });

  it("asks before the harness changes when the path arrives absolute", () => {
    expect(
      decide({
        context: fake({ repository: () => "/repo" }),
        input: edit({ file: "/repo/.claude/settings.json", newString: "{}" }),
      }),
    ).toMatch(/harness/);
    expect(
      decide({
        context: fake({ repository: () => "/repo" }),
        input: edit({ file: "/repo/hooks/run.ts", newString: "exit(0);" }),
      }),
    ).toMatch(/harness/);
  });

  it("stays silent on a hooks directory that is not the plugin's", () => {
    expect(
      decide({
        context: fake({ repository: () => "/repo" }),
        input: edit({ file: "/repo/src/hooks/use-total.ts", newString: "export {};" }),
      }),
    ).toBeNull();
  });

  it("asks before a test is skipped", () => {
    expect(
      decide({
        context: fake({}),
        input: edit({ file: "src/a.test.ts", newString: "it.skip('does the thing', () => {});" }),
      }),
    ).toMatch(/test/);
  });

  it("asks before a test file is deleted", () => {
    expect(
      decide({
        context: fake({}),
        input: { tool_name: "Bash", tool_input: { command: "rm src/a.test.ts" } },
      }),
    ).toMatch(/test/);
  });

  it("stays silent when a test is added", () => {
    expect(
      decide({
        context: fake({}),
        input: edit({ file: "src/a.test.ts", newString: "it('does the thing', () => {});" }),
      }),
    ).toBeNull();
  });
});
