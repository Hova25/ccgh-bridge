import type { ZodType } from "zod";
import type { LoadedContent } from "./load";
import type { ContentKind, ContentLocation } from "./paths";
import { checkCycles } from "./rules/cycles";
import { checkNaming } from "./rules/naming";
import { checkReferences } from "./rules/references";
import { checkStatus } from "./rules/status";
import { checkStructure } from "./rules/structure";
import {
  brainstormSchema,
  decisionSchema,
  domainSchema,
  fixSchema,
  guideSchema,
  iterationSchema,
  taskSchema,
} from "./schemas";

export type Failure = {
  file: string;
  message: string;
};

export type ParsedEntry = {
  location: ContentLocation;
  data: Record<string, unknown>;
  body: string;
};

type Rule = (entries: ParsedEntry[]) => Failure[];

const rules: Rule[] = [checkReferences, checkCycles, checkNaming, checkStatus, checkStructure];

const schemaByKind: Record<ContentKind, ZodType> = {
  domain: domainSchema,
  guide: guideSchema,
  decision: decisionSchema,
  fix: fixSchema,
  iteration: iterationSchema,
  brainstorm: brainstormSchema,
  task: taskSchema,
};

export const validate = (loaded: LoadedContent): Failure[] => {
  const failures: Failure[] = [
    ...loaded.unknown.map((file) => ({
      file,
      message: "does not match any known content shape",
    })),
    ...loaded.unreadable.map(({ file, reason }) => ({
      file,
      message: `front matter could not be parsed: ${reason}`,
    })),
  ];

  const parsed: ParsedEntry[] = [];

  for (const entry of loaded.entries) {
    const result = schemaByKind[entry.location.kind].safeParse(entry.data);

    if (result.success) {
      parsed.push({
        location: entry.location,
        data: result.data as Record<string, unknown>,
        body: entry.body,
      });
      continue;
    }

    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "front matter";
      failures.push({ file: entry.location.file, message: `${field}: ${issue.message}` });
    }
  }

  for (const rule of rules) failures.push(...rule(parsed));

  return failures;
};
