import type { Decide } from "../context";

const skippedTest = /\b(?:it|test|describe)\.(?:skip|todo)\b|\bxit\b|\bxdescribe\b/;
const deletedTest = /\brm\b[^\n]*\.(?:test|spec)\.[cm]?[jt]sx?\b/;
// The harness is whatever decides how the assistant behaves: the session's own configuration
// and, in a repository that carries the plugin, the plugin itself.
const harness = [".claude/", ".claude-plugin/", "hooks/", "skills/"];

export const decide: Decide = ({ input }) => {
  const {
    file_path: file = "",
    new_string: newString,
    content,
    command = "",
  } = input?.tool_input ?? {};
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
