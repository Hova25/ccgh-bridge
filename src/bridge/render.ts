import type { ParsedEntry } from "../model/validate";

export type RenderedIssue = {
  title: string;
  body: string;
  milestone: string;
  labels: string[];
};

const MARKER = "generated-from:";

const isSectionHeader = (line: string): boolean => /^\*\*\w+\*\*\s*$/.test(line);

const isSectionBoundary = (line: string): boolean =>
  isSectionHeader(line) || /^---\s*$/.test(line) || /^- \[[ x]\] \*\*Step/.test(line);

const section = ({ body, name }: { body: string; name: string }): string => {
  const lines = body.split("\n");
  const header = `**${name}**`;
  let inFence = false;
  let start = -1;

  for (const [index, line] of lines.entries()) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    if (start === -1) {
      if (line.trim() === header) start = index + 1;
      continue;
    }

    if (isSectionBoundary(line)) return lines.slice(start, index).join("\n").trim();
  }

  return start === -1 ? "" : lines.slice(start).join("\n").trim();
};

const firstParagraph = (body: string): string => {
  const afterHeading = body.replace(/^[\s\S]*?^#\s+.+$/m, "").trimStart();
  const [paragraph = ""] = afterHeading.split(/\n\s*\n/);

  return paragraph.trim();
};

export const renderIssue = ({
  task,
  total,
  url,
}: {
  task: ParsedEntry;
  total: number;
  url: string;
}): RenderedIssue => {
  const { location, data, body } = task;
  const interfaces = section({ body, name: "Interfaces" });

  const lines = [firstParagraph(body), "", "**Files**", "", section({ body, name: "Files" })];

  if (interfaces) lines.push("", "**Interfaces**", "", interfaces);

  lines.push(
    "",
    "---",
    `\`${location.reference}\` · task ${data.order} of ${total} · [full detail](${url})`,
    `<!-- ${MARKER} ${location.file} -->`,
  );

  return {
    title: data.title as string,
    body: lines.join("\n"),
    milestone: location.reference as string,
    labels: [location.domain],
  };
};

export const fileFromMarker = (body: string): string | null => {
  const found = [...body.matchAll(new RegExp(`<!--\\s*${MARKER}\\s*(\\S+)\\s*-->`, "g"))];

  return found.at(-1)?.[1] ?? null;
};
