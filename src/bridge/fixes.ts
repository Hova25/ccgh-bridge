import { DATED_PREFIX } from "../model/schemas";
import type { ParsedEntry } from "../model/validate";
import type { RemoteState } from "./github";

import { fileFromMarker } from "./render";

const MARKER = "generated-from:";

export type PlannedFixIssue = {
  file: string;
  title: string;
  body: string;
  domain: string;
};

const firstParagraph = (body: string): string => {
  const afterHeading = body.replace(/^[\s\S]*?^#\s+.+$/m, "").trimStart();
  const [paragraph = ""] = afterHeading.split(/\n\s*\n/);

  return paragraph.trim();
};

const fixes = (entries: ParsedEntry[]): ParsedEntry[] =>
  entries.filter((entry) => entry.location.kind === "fix");

const generatedFiles = (remote: RemoteState): Set<string> =>
  new Set(
    remote.issues
      .map((issue) => fileFromMarker(issue.body))
      .filter((file): file is string => file !== null),
  );

export const planFixIssues = ({
  entries,
  remote,
  arriving,
  pullRequest,
}: {
  entries: ParsedEntry[];
  remote: RemoteState;
  arriving: Set<string>;
  pullRequest: number;
}): PlannedFixIssue[] => {
  const already = generatedFiles(remote);
  const where =
    pullRequest > 0
      ? `under review in #${pullRequest}`
      : "waiting for the pull request that carries it";

  return fixes(entries)
    .filter((entry) => arriving.has(entry.location.file))
    .filter((entry) => entry.data.issue === null && !already.has(entry.location.file))
    .map((entry) => ({
      file: entry.location.file,
      title: entry.data.title as string,
      domain: entry.location.domain,
      body: [
        firstParagraph(entry.body),
        "",
        "---",
        `A fix in \`${entry.location.domain}\`, recorded at \`${entry.location.file}\`, ${where}.`,
        `<!-- ${MARKER} ${entry.location.file} -->`,
      ].join("\n"),
    }));
};

export const abandonedFixIssues = ({
  entries,
  remote,
}: {
  entries: ParsedEntry[];
  remote: RemoteState;
}): Array<{ issue: number; file: string }> => {
  const present = new Set(fixes(entries).map((entry) => entry.location.file));

  return remote.issues
    .filter((issue) => issue.state === "open")
    .map((issue) => ({ issue: issue.number, file: fileFromMarker(issue.body) }))
    .filter((item): item is { issue: number; file: string } => item.file !== null)
    .filter((item) => /^[a-z0-9-]+\/fixes\//.test(item.file) && !present.has(item.file));
};

export const issuesArriving = ({
  entries,
  arriving,
}: {
  entries: ParsedEntry[];
  arriving: Set<string>;
}): number[] =>
  fixes(entries)
    .filter((entry) => arriving.has(entry.location.file))
    .map((entry) => entry.data.issue)
    .filter((issue): issue is number => typeof issue === "number");

const CLOSING = /^Closes #\d+$/m;

export const bodyClosing = ({
  body,
  issues,
}: {
  body: string;
  issues: number[];
}): string | null => {
  const missing = issues.filter((issue) => !new RegExp(`^Closes #${issue}$`, "m").test(body));

  if (missing.length === 0) return null;

  const lines = missing.map((issue) => `Closes #${issue}`);

  return CLOSING.test(body)
    ? `${body.trimEnd()}\n${lines.join("\n")}\n`
    : `${body.trimEnd()}\n\n${lines.join("\n")}\n`;
};

export const branchForFix = (file: string): string => {
  const [domain = "", , name = ""] = file.split("/");

  return `fix/${domain}/${name.replace(/\.md$/, "").replace(new RegExp(`^${DATED_PREFIX}-`), "")}`;
};

export const fixesMissingTheirPullRequest = ({
  entries,
}: {
  entries: ParsedEntry[];
}): Array<{ file: string; branch: string }> =>
  fixes(entries)
    .filter((entry) => entry.data.pr === null || entry.data.pr === undefined)
    .map((entry) => ({
      file: entry.location.file,
      branch: branchForFix(entry.location.file),
    }));
