import type { ParsedEntry } from "../model/validate";

export type Completion = { file: string; issue: number; pr: number; mergedAt: string };

const KEYWORDS = "close[sd]?|fix(?:e[sd])?|resolve[sd]?";

export const closingIssues = ({ body }: { body: string }): number[] => {
  const pattern = new RegExp(`\\b(?:${KEYWORDS})\\b\\s+#(\\d+)`, "gi");

  return [...new Set([...body.matchAll(pattern)].map((match) => Number(match[1])))];
};

export const completionsFor = ({
  entries,
  pr,
  mergedAt,
  body,
}: {
  entries: ParsedEntry[];
  pr: number;
  mergedAt: string;
  body: string;
}): Completion[] => {
  const byIssue = new Map(
    entries
      .filter((entry) => entry.location.kind === "task" && entry.data.issue)
      .map((entry) => [entry.data.issue as number, entry.location.file]),
  );

  return closingIssues({ body })
    .filter((issue) => byIssue.has(issue))
    .map((issue) => ({ file: byIssue.get(issue) as string, issue, pr, mergedAt }));
};

export const completionComment = ({
  completion,
  base,
}: {
  completion: Completion;
  base: string;
}): string =>
  [
    `Implemented by #${completion.pr}, merged into \`${base}\` on ${completion.mergedAt}.`,
    "",
    "This issue stays open until the iteration branch reaches `main`, where its closing keyword",
    "can finally fire. GitHub only links a pull request to an issue when it targets the default",
    "branch, so this comment is the link.",
  ].join("\n");
