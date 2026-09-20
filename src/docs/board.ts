import type { ParsedEntry } from "../model/validate";
import { urlFor } from "./routes";

export type BoardEntry = {
  reference: string;
  title: string;
  href: string;
  taskCount: number;
  doneCount: number;
  blockedBy: string[];
};

export type Board = {
  inFlight: BoardEntry[];
  launchable: BoardEntry[];
  blocked: BoardEntry[];
  shipped: BoardEntry[];
};

const isDone = (task: ParsedEntry): boolean => {
  const github = (task.data.github ?? {}) as { state?: string | null; merged_at?: string | null };

  return github.state === "closed" || Boolean(github.merged_at);
};

export const boardOf = ({ entries }: { entries: ParsedEntry[] }): Board => {
  const iterations = entries.filter((entry) => entry.location.kind === "iteration");
  const statusOf = new Map(
    iterations.map((entry) => [entry.location.reference as string, entry.data.status as string]),
  );

  const board: Board = { inFlight: [], launchable: [], blocked: [], shipped: [] };

  for (const entry of iterations) {
    const reference = entry.location.reference as string;
    const tasks = entries.filter(
      (candidate) =>
        candidate.location.kind === "task" && candidate.location.reference === reference,
    );

    const blockedBy = ((entry.data.depends_on as string[]) ?? []).filter(
      (dependency) => statusOf.get(dependency) !== "shipped",
    );

    const item: BoardEntry = {
      reference,
      title: entry.data.title as string,
      href: urlFor(entry.location),
      taskCount: tasks.length,
      doneCount: tasks.filter(isDone).length,
      blockedBy,
    };

    const status = entry.data.status as string;

    if (status === "active") board.inFlight.push(item);
    else if (status === "shipped") board.shipped.push(item);
    else if (status === "ready") {
      (blockedBy.length > 0 ? board.blocked : board.launchable).push(item);
    }
  }

  const iterationOf = (entry: BoardEntry) =>
    entry.reference.slice(entry.reference.indexOf("/") + 1);

  const byReference = (entries: BoardEntry[]) =>
    entries.sort((a, b) => a.reference.localeCompare(b.reference));

  byReference(board.inFlight);
  byReference(board.launchable);
  byReference(board.blocked);
  board.shipped.sort((a, b) => iterationOf(b).localeCompare(iterationOf(a)));

  return board;
};
