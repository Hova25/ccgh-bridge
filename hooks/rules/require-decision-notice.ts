import { isAbsolute, relative, sep } from "node:path";
import type { Context, Decide } from "../context";

const skippedTest = /\b(?:it|test|describe)\.(?:skip|todo)\b|\bxit\b|\bxdescribe\b/;
const deletedTest = /\b(?:rm|del|erase|ri|remove-item)\b[^\n]*\.(?:test|spec)\.[cm]?[jt]sx?\b/i;
// The harness is whatever decides how the assistant behaves: the session's own configuration
// and, in a repository that carries the plugin, the plugin itself.
const harness = [".claude/", ".claude-plugin/", "hooks/", "skills/"];

// Claude Code sends absolute paths, and the harness prefixes only mean something from the
// repository root: matching them anywhere in the path would also catch `src/hooks/`.
const fromRepository = ({ file, context }: { file: string; context: Context }) =>
  isAbsolute(file) ? relative(context.repository(), file).split(sep).join("/") : file;

export const decide: Decide = ({ input, context }) => {
  const {
    file_path: absolute = "",
    new_string: newString,
    content,
    command = "",
  } = input?.tool_input ?? {};
  const file = fromRepository({ file: absolute, context });
  const text = content ?? newString ?? "";

  if (deletedTest.test(command)) {
    return "This deletes a test file. Confirm the decision before it happens.";
  }

  if (file.endsWith("package.json") && /"[^"]+"\s*:\s*"[\^~]?\d/.test(text)) {
    return "This adds or changes a dependency. Confirm the decision before it happens.";
  }

  if (harness.some((prefix) => file.startsWith(prefix)) || file.endsWith("CLAUDE.md")) {
    return "This changes the harness itself. Confirm the decision before it happens.";
  }

  if (skippedTest.test(text)) {
    return "This disables a test. Confirm the decision before it happens.";
  }

  return null;
};
