import type { Decide, HookInput } from "../context";

// Only French words, which is what this refuses: the repository it came from was written by a
// French-speaking team obliged to write in English. It is not a test for English.
const frenchWords = [
  "alors",
  "aussi",
  "avec",
  "cette",
  "dans",
  "des",
  "donc",
  "elle",
  "est",
  "etre",
  "fait",
  "jamais",
  "leur",
  "mais",
  "nous",
  "pas",
  "pour",
  "quand",
  "que",
  "qui",
  "sans",
  "sont",
  "sur",
  "toujours",
  "tous",
  "tout",
  "une",
  "vous",
];

const text = (input: HookInput): string => {
  const { content, new_string: newString, command } = input?.tool_input ?? {};

  if (content || newString) return content ?? newString ?? "";
  if (command) return /\bgit\s+commit\b/.test(command) ? command : "";

  return "";
};

export const decide: Decide = ({ input, context }) => {
  const refused = context.configuration().language?.refuse ?? frenchWords;

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
