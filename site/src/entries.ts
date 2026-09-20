import { getCollection } from "astro:content";
import { locate } from "../../src/model/paths";
import type { ParsedEntry } from "../../src/model/validate";

const COLLECTIONS = [
  "domains",
  "guides",
  "decisions",
  "fixes",
  "iterations",
  "brainstorms",
  "tasks",
] as const;

export const entriesOf = async (): Promise<ParsedEntry[]> => {
  const all: ParsedEntry[] = [];

  for (const name of COLLECTIONS) {
    for (const entry of await getCollection(name)) {
      const location = locate(`${entry.id}.md`);
      if (!location) continue;

      all.push({
        location,
        data: entry.data as Record<string, unknown>,
        body: (entry as { body?: string }).body ?? "",
      });
    }
  }

  return all;
};
