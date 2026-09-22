import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoadedContent } from "../model/load";
import { planPromotion, run } from "./promote";

const content = (entries: Array<[string, Record<string, unknown>]>): LoadedContent => {
  return {
    unknown: [],
    unreadable: [],
    entries: entries.map(([file, data]) => ({
      location: {
        kind: file.endsWith("spec.md") ? "iteration" : "task",
        domain: file.split("/")[0] as string,
        iteration: file.split("/")[2] as string,
        reference: `${file.split("/")[0]}/${file.split("/")[2]}`,
        file,
      },
      data,
      body: "",
    })),
  };
};

const bootstrap = "harness/iterations/2026-09-13-1529-bootstrap";

describe("planPromotion", () => {
  it("plans a draft into ready and lists its tasks", () => {
    const plan = planPromotion({
      loaded: content([
        [
          `${bootstrap}/spec.md`,
          { title: "Bootstrap", status: "draft", depends_on: [], impacts: [] },
        ],
        [`${bootstrap}/tasks/01-a.md`, { title: "First", order: 1 }],
        [`${bootstrap}/tasks/02-b.md`, { title: "Second", order: 2 }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "ready",
    });

    expect(plan.from).toBe("draft");
    expect(plan.taskTitles).toEqual(["First", "Second"]);
    expect(plan.blockers).toEqual([]);
  });

  it("records the approved task set as paths the bridge can rebuild", () => {
    const plan = planPromotion({
      loaded: content([
        [`${bootstrap}/spec.md`, { title: "B", status: "ready", depends_on: [], impacts: [] }],
        [`${bootstrap}/tasks/01-a.md`, { title: "First", order: 1 }],
        [`${bootstrap}/tasks/02-b.md`, { title: "Second", order: 2 }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "active",
    });

    expect(plan.taskFiles).toEqual(["tasks/01-a.md", "tasks/02-b.md"]);
  });

  it("blocks a promotion to ready when the iteration has no task", () => {
    const plan = planPromotion({
      loaded: content([
        [`${bootstrap}/spec.md`, { title: "B", status: "draft", depends_on: [], impacts: [] }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "ready",
    });

    expect(plan.blockers[0]).toMatch(/no task/);
  });

  it("blocks an illegal transition", () => {
    const plan = planPromotion({
      loaded: content([
        [`${bootstrap}/spec.md`, { title: "B", status: "draft", depends_on: [], impacts: [] }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "active",
    });

    expect(plan.blockers[0]).toMatch(/draft.*active/);
  });

  it("lets an active iteration be relaunched to re-approve its task set", () => {
    const plan = planPromotion({
      loaded: content([
        [`${bootstrap}/spec.md`, { title: "B", status: "active", depends_on: [], impacts: [] }],
        [`${bootstrap}/tasks/01-a.md`, { title: "First", order: 1 }],
        [`${bootstrap}/tasks/02-b.md`, { title: "Second", order: 2 }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "active",
    });

    expect(plan.blockers).toEqual([]);
    expect(plan.relaunch).toBe(true);
    expect(plan.taskFiles).toEqual(["tasks/01-a.md", "tasks/02-b.md"]);
  });

  it("still refuses to launch a draft", () => {
    const plan = planPromotion({
      loaded: content([
        [`${bootstrap}/spec.md`, { title: "B", status: "draft", depends_on: [], impacts: [] }],
        [`${bootstrap}/tasks/01-a.md`, { title: "First", order: 1 }],
      ]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "active",
    });

    expect(plan.blockers[0]).toMatch(/draft.*active/);
  });

  it("blocks a launch while a dependency is not shipped", () => {
    const plan = planPromotion({
      loaded: content([
        [
          "auth/iterations/2026-09-13-login/spec.md",
          { title: "L", status: "active", depends_on: [], impacts: [] },
        ],
        [
          "billing/iterations/2026-10-01-checkout/spec.md",
          { title: "C", status: "ready", depends_on: ["auth/2026-09-13-login"], impacts: [] },
        ],
        ["billing/iterations/2026-10-01-checkout/tasks/01-a.md", { title: "First", order: 1 }],
      ]),
      reference: "billing/2026-10-01-checkout",
      to: "active",
    });

    expect(plan.blockers[0]).toMatch(/auth\/2026-09-13-login is active/);
  });

  it("allows a launch once every dependency is shipped", () => {
    const plan = planPromotion({
      loaded: content([
        [
          "auth/iterations/2026-09-13-login/spec.md",
          { title: "L", status: "shipped", depends_on: [], impacts: [] },
        ],
        [
          "billing/iterations/2026-10-01-checkout/spec.md",
          { title: "C", status: "ready", depends_on: ["auth/2026-09-13-login"], impacts: [] },
        ],
        ["billing/iterations/2026-10-01-checkout/tasks/01-a.md", { title: "First", order: 1 }],
      ]),
      reference: "billing/2026-10-01-checkout",
      to: "active",
    });

    expect(plan.blockers).toEqual([]);
    expect(plan.taskTitles).toEqual(["First"]);
  });

  it("blocks an unknown iteration", () => {
    const plan = planPromotion({
      loaded: content([]),
      reference: "harness/2026-09-13-1529-bootstrap",
      to: "ready",
    });

    expect(plan.blockers[0]).toMatch(/does not exist/);
  });
});

describe("ccgh promote", () => {
  const probe = "docs/ccgh-bridge/engine/iterations/2026-01-01-0900-probe";
  const spec = `${probe}/spec.md`;
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ccgh-promote-"));
    await mkdir(join(root, ".git"));
    await mkdir(join(root, probe, "tasks"), { recursive: true });
    await writeFile(
      join(root, "docs/ccgh-bridge/engine/index.md"),
      "---\ntitle: Engine\nsummary: The engine.\n---\n\nProse.\n",
      "utf8",
    );
    await writeFile(
      join(root, spec),
      "---\ntitle: Probe\nstatus: draft\ndepends_on: []\nimpacts: []\n---\n\n# Probe\n",
      "utf8",
    );
    await writeFile(
      join(root, probe, "tasks", "01-first.md"),
      [
        "---",
        "title: First",
        "order: 1",
        "issue: null",
        "github:",
        "  state: null",
        "  pr: null",
        "  merged_at: null",
        "  synced_at: null",
        "---",
        "",
        "# First",
        "",
        "What this task delivers.",
        "",
        "**Files**",
        "",
        "- Create: `src/first.ts`",
        "",
        "**Interfaces**",
        "",
        "- Consumes: nothing.",
        "",
      ].join("\n"),
      "utf8",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes into the repository it was run in", async () => {
    expect(await run({ argv: ["engine/2026-01-01-0900-probe", "--to", "ready"], cwd: root })).toBe(
      0,
    );

    const written = await readFile(join(root, spec), "utf8");

    expect(written).toContain("status: ready");
    expect(written).toContain("validated_by:");
  });

  it("quotes what it writes the way Prettier does by default", async () => {
    await run({ argv: ["engine/2026-01-01-0900-probe", "--to", "ready"], cwd: root });

    const written = await readFile(join(root, spec), "utf8");

    expect(written).toMatch(/^validated_at: "\d{4}-\d{2}-\d{2}T[\d:.]+Z"$/m);
    expect(written).not.toContain("'");
  });

  it("writes nothing on a dry run", async () => {
    const before = await readFile(join(root, spec), "utf8");

    expect(
      await run({
        argv: ["engine/2026-01-01-0900-probe", "--to", "ready", "--dry-run"],
        cwd: root,
      }),
    ).toBe(0);

    expect(await readFile(join(root, spec), "utf8")).toBe(before);
  });

  it("refuses a target that is not a status it may write", async () => {
    expect(
      await run({ argv: ["engine/2026-01-01-0900-probe", "--to", "shipped"], cwd: root }),
    ).toBe(1);
  });
});
