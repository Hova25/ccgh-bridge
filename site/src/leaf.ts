import { urlFor } from "../../src/docs/routes";
import type { ContentLocation } from "../../src/model/paths";
import { entriesOf } from "./entries";

export { slugOf } from "../../src/docs/leaf";

export const pathsFor = async ({
  kind,
  params,
}: {
  kind: ContentLocation["kind"];
  params: (location: ContentLocation) => Record<string, string>;
}) => {
  const entries = await entriesOf();

  return entries
    .filter((entry) => entry.location.kind === kind)
    .map((entry) => ({ params: params(entry.location), props: { file: entry.location.file } }));
};

export const leafOf = async ({ file }: { file: string }) => {
  const entries = await entriesOf();
  const entry = entries.find((candidate) => candidate.location.file === file);

  if (!entry) throw new Error(`no entry at ${file}, though a route was generated for it`);

  return { entries, entry, currentUrl: urlFor(entry.location) };
};
