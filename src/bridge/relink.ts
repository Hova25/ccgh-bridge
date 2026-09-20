import type { RemoteBody } from "./github";
export type RenameRow = { from: string; to: string };

// Nine lines borrowed from the origin's mass-rename script, inlined at its only consumer
// rather than carrying a hundred and seventy-seven lines of a migration that already
// happened. Longest first, so that a path is never rewritten through a prefix of itself.
const rewrite = ({ text, table }: { text: string; table: RenameRow[] }): string =>
  [...table]
    .sort((first, second) => second.from.length - first.from.length)
    .reduce((out, row) => out.replaceAll(row.from, row.to), text);

// Only the bridge writes these two: the link in a task issue, the marker as the last line of
// every issue it opens. A person quoting the marker mid-body — a fix record did — is not it.
const BRIDGE_LINK = "/blob/main/apps/development-documentation/src/content/";
const CLOSING_MARKER = /<!-- generated-from: \S+ -->\s*$/;

const writtenByTheBridge = (body: string): boolean =>
  body.includes(BRIDGE_LINK) || CLOSING_MARKER.test(body);

export const readTable = (markdown: string): RenameRow[] =>
  [...markdown.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|$/gm)].map(([, from = "", to = ""]) => ({
    from,
    to,
  }));

export const planRelink = ({
  bodies,
  table,
}: {
  bodies: RemoteBody[];
  table: RenameRow[];
}): RemoteBody[] =>
  bodies
    .filter((item) => writtenByTheBridge(item.body))
    .flatMap((item) => {
      const body = rewrite({ text: item.body, table });

      return body === item.body ? [] : [{ ...item, body }];
    });

export const namesRewritten = ({ before, table }: { before: string; table: RenameRow[] }): number =>
  table.filter((row) => before.includes(row.from)).length;
