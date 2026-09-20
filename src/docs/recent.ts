import type { ParsedEntry } from "../model/validate";
import { urlFor } from "./routes";

export type RecentIssue = {
  issue: number;
  title: string;
  url: string;
  state: "open" | "closed";
};

const stateOf = (entry: ParsedEntry): "open" | "closed" => {
  if (entry.location.kind === "fix") return "closed";

  const mirror = entry.data.github as { state?: string | null } | undefined;

  return mirror?.state === "closed" ? "closed" : "open";
};

export const recentIssues = ({
  entries,
  limit = 10,
}: {
  entries: ParsedEntry[];
  limit?: number;
}): RecentIssue[] =>
  entries
    .filter((entry) => entry.location.kind === "task" || entry.location.kind === "fix")
    .filter((entry) => typeof entry.data.issue === "number")
    .map((entry) => ({
      issue: entry.data.issue as number,
      title: entry.data.title as string,
      url: urlFor(entry.location),
      state: stateOf(entry),
    }))
    .sort((a, b) => b.issue - a.issue)
    .slice(0, limit);
