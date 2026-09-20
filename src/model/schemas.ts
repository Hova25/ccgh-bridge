import { z } from "zod";

export const iterationStatuses = ["draft", "ready", "active", "shipped"] as const;

export const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
export const DATED_PREFIX = "\\d{4}-\\d{2}-\\d{2}-\\d{4}";
export const DATED_NAME = `${DATED_PREFIX}-${SLUG}`;
export const datedName = new RegExp(`^${DATED_NAME}$`);

export const domainReference = z.string().regex(new RegExp(`^${SLUG}$`), "expected a domain slug");

export const iterationReference = z
  .string()
  .regex(new RegExp(`^${SLUG}/${DATED_NAME}$`), "expected <domain>/<yyyy-mm-dd-HHMM>-<slug>");

const timestamp = z.coerce.date();

export const domainSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const guideSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
});

export const decisionSchema = z.object({
  title: z.string().min(1),
  date: timestamp,
  status: z.enum(["accepted", "superseded"]),
  supersedes: z
    .string()
    .regex(/^\d{3}$/)
    .nullable()
    .default(null),
});

export const iterationSchema = z.object({
  title: z.string().min(1),
  status: z.enum(iterationStatuses),
  depends_on: z.array(iterationReference).default([]),
  impacts: z.array(domainReference).default([]),
  validated_by: z.string().nullable().default(null),
  validated_at: timestamp.nullable().default(null),
  launched_by: z.string().nullable().default(null),
  launched_at: timestamp.nullable().default(null),
  launched_tasks: z.array(z.string()).default([]),
});

export const brainstormSchema = z.object({
  title: z.string().min(1),
  date: timestamp,
  participants: z.array(z.string()).min(1),
});

export const githubMirrorSchema = z.object({
  state: z.enum(["open", "closed"]).nullable().default(null),
  pr: z.number().int().positive().nullable().default(null),
  merged_at: timestamp.nullable().default(null),
  synced_at: timestamp.nullable().default(null),
});

export const fixSchema = z.object({
  title: z.string().min(1),
  date: timestamp,
  issue: z.number().int().positive().nullable().default(null),
  pr: z.number().int().positive().nullable().default(null),
});

export const taskSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().positive(),
  issue: z.number().int().positive().nullable().default(null),
  github: githubMirrorSchema.prefault({}),
});
