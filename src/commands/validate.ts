import { existsSync } from "node:fs";
import { configuration } from "../configuration";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { contentRoot } from "../project";

export const run = async ({ cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const root = contentRoot({ from: cwd });

  if (!existsSync(root)) {
    // A repository that named its content directory and got it wrong is a typo. One that has
    // not started has nothing to validate, and a red build on its first push after `ccgh init`
    // is a bad first thing to happen to it.
    if (configuration({ from: cwd }).content) {
      process.stderr.write(`no content directory at ${root}\n`);

      return 1;
    }

    process.stdout.write(`no content yet: write ${root}/<domain>/index.md to start\n`);

    return 0;
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
