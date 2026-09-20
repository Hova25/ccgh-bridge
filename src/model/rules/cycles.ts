import type { Failure, ParsedEntry } from "../validate";

export const checkCycles = (entries: ParsedEntry[]): Failure[] => {
  const iterations = entries.filter((entry) => entry.location.kind === "iteration");
  const dependencies = new Map<string, string[]>();
  const files = new Map<string, string>();

  for (const entry of iterations) {
    const reference = entry.location.reference as string;
    const value = entry.data.depends_on;

    dependencies.set(reference, Array.isArray(value) ? (value as string[]) : []);
    files.set(reference, entry.location.file);
  }

  const settled = new Set<string>();
  const onPath = new Set<string>();
  const failures: Failure[] = [];

  const walk = ({ reference, path }: { reference: string; path: string[] }): void => {
    if (settled.has(reference)) return;

    if (onPath.has(reference)) {
      const members = path.slice(path.indexOf(reference));
      const cycle = [...members, reference].join(" -> ");

      for (const member of members) {
        failures.push({ file: files.get(member) as string, message: `dependency cycle: ${cycle}` });
      }

      return;
    }

    onPath.add(reference);

    for (const next of dependencies.get(reference) ?? []) {
      if (dependencies.has(next)) walk({ reference: next, path: [...path, reference] });
    }

    onPath.delete(reference);
    settled.add(reference);
  };

  for (const reference of dependencies.keys()) walk({ reference, path: [] });

  return failures;
};
