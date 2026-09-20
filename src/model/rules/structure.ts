import type { Failure, ParsedEntry } from "../validate";

const headingThenParagraph = /^#\s+.+\n\s*\n\s*(?!\*\*|[-*]\s|#)\S/m;

const withoutFencedCode = (body: string): string => body.replace(/^```[\s\S]*?^```/gm, "");

export const checkStructure = (entries: ParsedEntry[]): Failure[] => {
  const failures: Failure[] = [];

  for (const entry of entries) {
    if (entry.location.kind !== "task") continue;

    const file = entry.location.file;
    const prose = withoutFencedCode(entry.body);

    if (!headingThenParagraph.test(prose)) {
      failures.push({ file, message: "needs a first paragraph after the heading" });
    }

    for (const section of ["Files", "Interfaces"]) {
      if (!new RegExp(`^\\*\\*${section}\\*\\*\\s*$`, "m").test(prose)) {
        failures.push({ file, message: `needs a **${section}** section` });
      }
    }
  }

  return failures;
};
