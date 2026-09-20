import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repositoryRoot } from "./project";

export type Configuration = {
  content?: string;
  title?: string;
  repository?: string;
  site?: string;
  check?: string[];
  language?: { refuse: string[] };
};

const file = "ccgh.json";

export const configuration = ({ from }: { from: string }): Configuration => {
  const path = join(repositoryRoot({ from }), file);

  if (!existsSync(path)) return {};

  try {
    // Unknown keys are kept rather than rejected: a repository shared between two versions of
    // the harness should not break on a key the older one has never heard of.
    return JSON.parse(readFileSync(path, "utf8")) as Configuration;
  } catch (error) {
    // A silent fallback here runs the wrong checks and reports success.
    throw new Error(`${file} is not valid JSON: ${(error as Error).message}`);
  }
};
