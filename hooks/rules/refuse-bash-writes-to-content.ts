import type { Decide } from "../context";

const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const decide: Decide = ({ input, context }) => {
  // PowerShell spells paths with backslashes, and the content root is matched with slashes.
  const command = (input?.tool_input?.command ?? "").replaceAll("\\", "/");
  const target = `[^\\s"'|;&>]*${escaped(`${context.content()}/`)}`;
  const writes = [
    { name: "a redirection", pattern: new RegExp(`>>?\\s*["']?${target}`) },
    { name: "tee", pattern: new RegExp(`\\btee\\s+(?:-a\\s+)?["']?${target}`) },
    {
      name: "an in-place edit",
      pattern: new RegExp(`\\b(?:sed|perl)\\b[^|;&]*-i[^|;&]*${target}`),
    },
    { name: "cp or mv", pattern: new RegExp(`\\b(?:cp|mv)\\s[^|;&]*${target}`) },
    {
      name: "a PowerShell cmdlet",
      pattern: new RegExp(
        `\\b(?:set-content|add-content|out-file|new-item|copy-item|move-item|copy|move|sc|ac|ni|cpi|mi)\\s[^|;&]*${target}`,
        "i",
      ),
    },
  ];
  const found = writes.find(({ pattern }) => pattern.test(command));

  if (!found) return null;

  return [
    `Refusing to write into the content tree with ${found.name}.`,
    "Use the Write or Edit tool instead. The hooks that refuse a generated field",
    "(status, issue, github:) and non-English prose only see those two tools, so a",
    "shell redirection writes content nothing has checked.",
  ].join("\n");
};
