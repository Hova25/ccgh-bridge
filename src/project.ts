import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const configuration = "ccgh.json";
const convention = "docs";

export const repositoryRoot = ({ from }: { from: string }): string => {
  const start = resolve(from);
  let directory = start;
  let parent = dirname(directory);

  while (directory !== parent) {
    if (existsSync(join(directory, ".git"))) return directory;

    directory = parent;
    parent = dirname(directory);
  }

  throw new Error(`no repository above ${start}: no .git found`);
};

export const contentRoot = ({ from }: { from: string }): string => {
  const root = repositoryRoot({ from });
  const file = join(root, configuration);

  if (!existsSync(file)) return join(root, convention);

  let parsed: { content?: unknown };

  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${configuration} is not valid JSON: ${(error as Error).message}`);
  }

  if (typeof parsed.content !== "string") return join(root, convention);

  return isAbsolute(parsed.content) ? parsed.content : join(root, parsed.content);
};
