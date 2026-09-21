import type { Decide, HookInput } from "../context";

const text = (input: HookInput): string => {
  const { content, new_string: newString, command } = input?.tool_input ?? {};

  if (content || newString) return content ?? newString ?? "";
  if (command) return /\bgit\s+commit\b/.test(command) ? command : "";

  return "";
};

export const decide: Decide = ({ input, context }) => {
  // No default: which language a repository keeps out of its prose is its own decision.
  const refused = context.configuration().language?.refuse ?? [];

  if (refused.length === 0) return null;

  const pattern = new RegExp(`\\b(${refused.join("|")})\\b`, "gi");
  const found = new Set(
    [...text(input).matchAll(pattern)].map((match) => (match[1] as string).toLowerCase()),
  );

  if (found.size < 2) return null;

  return [
    "This repository refuses the words below in its prose.",
    `Found: ${[...found].sort().join(", ")}.`,
    "Rewrite it, or change language.refuse in ccgh.json.",
  ].join("\n");
};
