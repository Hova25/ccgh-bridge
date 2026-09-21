import { DATED_NAME, SLUG } from "../model/schemas";
import { contentDirectory } from "../project";

export type Home = {
  kind: "iteration-branch" | "iteration" | "fix" | "content-only";
  detail: string;
};

const iterationBranch = new RegExp(`^${SLUG}/${DATED_NAME}$`);

const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const homeOf = ({
  base,
  changed,
  content,
}: {
  base: string;
  changed: string[];
  content: string;
}): Home | null => {
  const prefix = escaped(content);
  const iterationFile = new RegExp(`^${prefix}/(${SLUG})/iterations/(${DATED_NAME})/`);
  const fixFile = new RegExp(`^${prefix}/${SLUG}/fixes/${DATED_NAME}\\.md$`);

  if (iterationBranch.test(base)) return { kind: "iteration-branch", detail: base };

  if (changed.every((file) => file.startsWith(`${content}/`))) {
    return { kind: "content-only", detail: "" };
  }

  const iteration = changed.map((file) => iterationFile.exec(file)).find(Boolean);

  if (iteration) return { kind: "iteration", detail: `${iteration[1]}/${iteration[2]}` };

  const fix = changed.find((file) => fixFile.test(file));

  if (fix) return { kind: "fix", detail: fix.slice(`${content}/`.length) };

  return null;
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const [base = "", ...changed] = argv;
  const content = contentDirectory({ from: cwd });
  const home = homeOf({ base, changed, content });

  if (!home) {
    process.stderr.write(
      [
        "This pull request changes code and belongs to nothing.",
        "Code reaching main belongs to an iteration, whose specification and tasks it changes,",
        `or to a fix recorded at ${content}/<domain>/fixes/<yyyy-mm-dd-HHMM>-<slug>.md.`,
        "",
        "Changed:",
        ...changed.map((file) => `  ${file}`),
        "",
      ].join("\n"),
    );

    return 1;
  }

  process.stdout.write(`home: ${home.kind}${home.detail ? ` ${home.detail}` : ""}\n`);

  return 0;
};
