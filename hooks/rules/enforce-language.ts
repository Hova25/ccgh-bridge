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

const pattern = new RegExp(`\\b(${frenchWords.join("|")})\\b`, "gi");

const text = (input: HookInput): string => {
  const { content, new_string: newString, command } = input?.tool_input ?? {};

  if (content || newString) return content ?? newString ?? "";
  if (command) return /\bgit\s+commit\b/.test(command) ? command : "";

  return "";
};

export const decide: Decide = ({ input }) => {
  const found = new Set(
    [...text(input).matchAll(pattern)].map((match) => (match[1] as string).toLowerCase()),
  );

  if (found.size < 2) return null;

  return [
    "Everything in this repository is written in English.",
    `Found French words: ${[...found].sort().join(", ")}.`,
    "Rewrite the content in English and try again.",
  ].join("\n");
};
