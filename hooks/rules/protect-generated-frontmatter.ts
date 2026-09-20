import type { Decide } from "../context";

const bridgeFields = ["issue", "state", "pr", "merged_at", "synced_at"];
const promotionFields = [
  "validated_by",
  "validated_at",
  "launched_by",
  "launched_at",
  "launched_tasks",
];

const assigned = ({ text, field }: { text: string; field: string }): string | null => {
  const match = new RegExp(`^\\s*${field}\\s*:\\s*(.+)$`, "m").exec(text);
  const value = match?.[1]?.trim();

  return value && value !== "null" ? value : null;
};

export const decide: Decide = ({ input, context }) => {
  const file = input?.tool_input?.file_path ?? "";

  if (!file.includes(`${context.content()}/`)) return null;

  const text = input.tool_input?.content ?? input.tool_input?.new_string ?? "";

  for (const field of bridgeFields) {
    if (assigned({ text, field })) {
      return `Refusing to write ${field}. Only the GitHub bridge writes issue numbers and the github: mirror.`;
    }
  }

  for (const field of promotionFields) {
    if (assigned({ text, field })) {
      return `Refusing to write ${field}. Only the promotion script writes it, and it requires human approval.`;
    }
  }

  const isDecision = /\/decisions\/[^/]+\.md$/.test(file);
  const isSpecification = file.includes("/iterations/") && file.endsWith("/spec.md");
  const status = isDecision || isSpecification ? assigned({ text, field: "status" }) : null;

  if (isDecision) {
    return status && !["accepted", "superseded"].includes(status)
      ? `Refusing to write status: ${status}. A decision is accepted or superseded, nothing else.`
      : null;
  }

  if (status && !(status === "draft" && !context.fileExists(file))) {
    return [
      `Refusing to write status: ${status}.`,
      "An iteration is promoted by the promotion script, which requires human approval:",
      "  ccgh promote <domain>/<iteration> --to ready",
    ].join("\n");
  }

  return null;
};
