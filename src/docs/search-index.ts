import type { ParsedEntry } from "../model/validate";
import { urlFor } from "./routes";

export type SearchRecord = { title: string; path: string; url: string };

export const searchIndexOf = ({ entries }: { entries: ParsedEntry[] }): SearchRecord[] =>
  entries
    .map((entry) => ({
      title: (entry.data.title as string) ?? entry.location.file,
      path: urlFor(entry.location).slice(1).split("/").join(" / "),
      url: urlFor(entry.location),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));

export const matches = ({
  records,
  query,
}: {
  records: SearchRecord[];
  query: string;
}): SearchRecord[] => {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) return [];

  return records
    .map((record) => {
      const inTitle = record.title.toLowerCase().includes(needle);
      const inPath = record.path.toLowerCase().includes(needle);

      return { record, score: inTitle ? 2 : inPath ? 1 : 0 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.record);
};
