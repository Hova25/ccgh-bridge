import type { Failure, ParsedEntry } from "../validate";

const listOf = ({ entry, field }: { entry: ParsedEntry; field: string }): string[] => {
  const value = entry.data[field];
  return Array.isArray(value) ? (value as string[]) : [];
};

export const checkReferences = (entries: ParsedEntry[]): Failure[] => {
  const iterations = new Set(
    entries
      .filter((entry) => entry.location.kind === "iteration")
      .map((entry) => entry.location.reference),
  );
  const domains = new Set(entries.map((entry) => entry.location.domain));
  const failures: Failure[] = [];

  for (const entry of entries) {
    if (entry.location.kind !== "iteration") continue;

    const file = entry.location.file;

    for (const reference of listOf({ entry, field: "depends_on" })) {
      if (reference === entry.location.reference) {
        failures.push({ file, message: "depends_on: an iteration cannot depend on itself" });
      } else if (!iterations.has(reference)) {
        failures.push({ file, message: `depends_on: ${reference} does not exist` });
      }
    }

    for (const domain of listOf({ entry, field: "impacts" })) {
      if (domain === entry.location.domain) {
        failures.push({ file, message: `impacts: ${domain} owns this iteration` });
      } else if (!domains.has(domain)) {
        failures.push({ file, message: `impacts: ${domain} does not exist` });
      }
    }
  }

  return failures;
};
