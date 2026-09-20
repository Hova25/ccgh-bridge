import { existsSync } from "node:fs";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { contentRoot } from "../project";

export const run = async ({ cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const root = contentRoot({ from: cwd });

  if (!existsSync(root)) {
    process.stderr.write(`no content directory at ${root}\n`);

    return 1;
  }

  const failures = validate(await loadContent(root));

  for (const failure of failures) {
    process.stderr.write(`${failure.file}: ${failure.message}\n`);
  }

  process.stdout.write(
    failures.length === 0 ? "content is valid\n" : `${failures.length} problem(s) found\n`,
  );

  return failures.length === 0 ? 0 : 1;
};
