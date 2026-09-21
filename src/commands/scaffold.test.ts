import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DATED_PREFIX } from "../model/schemas";
import {
  domainScaffold,
  fixScaffold,
  iterationName,
  iterationScaffold,
  prefixAt,
  run,
  taskScaffold,
} from "./scaffold";

const now = new Date("2026-09-14T17:03:41Z");
const prefix = "2026-09-14-1703";

describe("prefixAt", () => {
  it("reads the UTC clock to the minute", () => {
    expect(prefixAt({ now: new Date("2026-09-15T22:10:41Z") })).toBe("2026-09-15-2210");
  });

  it("does not depend on the machine's zone", () => {
    expect(prefixAt({ now: new Date("2026-09-16T00:30:00+02:00") })).toBe("2026-09-15-2230");
  });

  it("matches the shape the validator demands", () => {
    expect(new RegExp(`^${DATED_PREFIX}$`).test(prefixAt({ now: new Date() }))).toBe(true);
  });
});

describe("iterationName", () => {
  it("dates the slug to the minute", () => {
    expect(iterationName({ slug: "example", prefix, taken: [] })).toBe("2026-09-14-1703-example");
  });

  it("appends a number when the minute and the slug are both taken", () => {
    expect(iterationName({ slug: "a", prefix, taken: ["2026-09-14-1703-a"] })).toBe(
      "2026-09-14-1703-a-2",
    );
  });

  it("keeps counting past the second", () => {
    expect(
      iterationName({ slug: "a", prefix, taken: ["2026-09-14-1703-a", "2026-09-14-1703-a-2"] }),
    ).toBe("2026-09-14-1703-a-3");
  });

  it("ignores another minute's iterations", () => {
    expect(iterationName({ slug: "a", prefix, taken: ["2026-09-14-1702-a"] })).toBe(
      "2026-09-14-1703-a",
    );
  });
});

describe("iterationScaffold", () => {
  const plan = iterationScaffold({ domain: "harness", slug: "a-thing", now, author: "hovannes" });

  it("returns the reference the promotion commands take", () => {
    expect(plan.reference).toBe("harness/2026-09-14-1703-a-thing");
  });

  it("writes a brainstorm and a specification, and nothing else", () => {
    expect(plan.files.map((file) => file.file)).toEqual([
      "harness/iterations/2026-09-14-1703-a-thing/brainstorm.md",
      "harness/iterations/2026-09-14-1703-a-thing/spec.md",
    ]);
  });

  it("dates the brainstorm to the day, from the same clock", () => {
    expect(plan.files[0]?.content).toMatch(/^date: 2026-09-14$/m);
  });

  it("starts the specification at draft, which is the only status anyone may write", () => {
    const spec = plan.files[1]?.content ?? "";

    expect(spec).toMatch(/^status: draft$/m);
    expect(spec).toMatch(/^depends_on: \[\]$/m);
    expect(spec).toMatch(/^impacts: \[\]$/m);
    expect(spec).not.toMatch(/validated_by|launched_by/);
  });

  it("gives the brainstorm the participants the schema demands", () => {
    expect(plan.files[0]?.content).toMatch(/participants:\n {2}- hovannes/);
  });

  it("titles both from the slug", () => {
    for (const file of plan.files) expect(file.content).toMatch(/^title: A thing$/m);
  });

  it("refuses a domain or a slug that is not one", () => {
    expect(() => iterationScaffold({ domain: "Harness", slug: "a", now, author: "x" })).toThrow(
      /domain/,
    );
    expect(() =>
      iterationScaffold({ domain: "harness", slug: "A Thing", now, author: "x" }),
    ).toThrow(/slug/);
  });
});

describe("fixScaffold", () => {
  const plan = fixScaffold({
    domain: "harness",
    slug: "name-the-next-step",
    now: new Date("2026-09-13T22:48:00Z"),
  });

  it("is written under fixes with the prefix and carries the null scaffolding", () => {
    expect(plan.reference).toBe("harness/fixes/2026-09-13-2248-name-the-next-step");
    expect(plan.files.map((file) => file.file)).toEqual([
      "harness/fixes/2026-09-13-2248-name-the-next-step.md",
    ]);
    expect(plan.files[0]?.content).toMatch(/^title: Name the next step$/m);
    expect(plan.files[0]?.content).toMatch(/^date: 2026-09-13$/m);
    expect(plan.files[0]?.content).toMatch(/^issue: null$/m);
    expect(plan.files[0]?.content).toMatch(/^pr: null$/m);
  });

  it("puts a paragraph after the heading, which becomes the issue body", () => {
    expect(plan.files[0]?.content).toMatch(/^# Name the next step\n\n<One paragraph/m);
  });

  it("refuses a domain or a slug that is not one", () => {
    expect(() => fixScaffold({ domain: "Harness", slug: "a", now })).toThrow(/domain/);
    expect(() => fixScaffold({ domain: "harness", slug: "A Thing", now })).toThrow(/slug/);
  });
});

describe("taskScaffold", () => {
  const task = taskScaffold({
    reference: "harness/2026-09-14-1703-a-thing",
    slug: "do-the-thing",
    order: 3,
  });

  it("numbers the file with a two-digit prefix", () => {
    expect(task.file).toBe("harness/iterations/2026-09-14-1703-a-thing/tasks/03-do-the-thing.md");
  });

  it("scaffolds every generated field as null", () => {
    expect(task.content).toMatch(/^issue: null$/m);
    expect(task.content).toMatch(/^ {2}state: null$/m);
    expect(task.content).toMatch(/^ {2}synced_at: null$/m);
  });

  it("carries the sections the structure rule demands", () => {
    expect(task.content).toMatch(/^\*\*Files\*\*$/m);
    expect(task.content).toMatch(/^\*\*Interfaces\*\*$/m);
  });

  it("puts a paragraph after the heading, which the structure rule also demands", () => {
    expect(task.content).toMatch(/^# Do the thing\n\n<One paragraph/m);
  });

  it("matches its order to its prefix", () => {
    expect(task.content).toMatch(/^order: 3$/m);
  });
});

describe("domainScaffold", () => {
  const plan = domainScaffold({ domain: "listings" });

  it("writes the domain's index, and nothing else", () => {
    expect(plan.reference).toBe("listings");
    expect(plan.files.map((file) => file.file)).toEqual(["listings/index.md"]);
  });

  it("carries the title and the summary the schema demands", () => {
    const [index] = plan.files;

    expect(index?.content).toMatch(/^---\ntitle: Listings\nsummary: .+\n---\n/);
  });

  it("refuses a name that is not a slug", () => {
    expect(() => domainScaffold({ domain: "Listings" })).toThrow(/slug/);
  });
});

describe("ccgh scaffold", () => {
  const content = join("docs", "ccgh-bridge");
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ccgh-scaffold-"));
    await mkdir(join(root, ".git"));
    await mkdir(join(root, content, "engine"), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes into the repository it was run in", async () => {
    expect(await run({ argv: ["iteration", "engine/probe"], cwd: root })).toBe(0);

    const written = await readdir(join(root, content, "engine", "iterations"));

    expect(written).toHaveLength(1);
    expect(written[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-probe$/);
  });

  it("refuses to overwrite a skeleton that already exists", async () => {
    await run({ argv: ["fix", "engine/probe"], cwd: root });

    expect(await run({ argv: ["fix", "engine/probe"], cwd: root })).toBe(1);
  });

  it("suffixes a second iteration in the same minute rather than overwriting the first", async () => {
    await run({ argv: ["iteration", "engine/probe"], cwd: root });

    expect(await run({ argv: ["iteration", "engine/probe"], cwd: root })).toBe(0);

    const written = await readdir(join(root, content, "engine", "iterations"));

    expect(written).toHaveLength(2);
    expect(written.some((name) => name.endsWith("-probe-2"))).toBe(true);
  });

  it("numbers a task from the count already in the directory", async () => {
    await run({ argv: ["iteration", "engine/probe"], cwd: root });
    const [iteration] = await readdir(join(root, content, "engine", "iterations"));

    await run({ argv: ["task", `engine/${iteration}`, "first"], cwd: root });
    await run({ argv: ["task", `engine/${iteration}`, "second"], cwd: root });

    const tasks = await readdir(join(root, content, "engine", "iterations", iteration, "tasks"));

    expect(tasks.sort()).toEqual(["01-first.md", "02-second.md"]);
  });

  it("creates a domain, and the content directory when it is missing", async () => {
    await rm(join(root, content), { recursive: true });

    expect(await run({ argv: ["domain", "listings"], cwd: root })).toBe(0);
    expect(await readdir(join(root, content))).toEqual(["listings"]);
  });

  it("refuses a domain that exists", async () => {
    await run({ argv: ["domain", "listings"], cwd: root });

    expect(await run({ argv: ["domain", "listings"], cwd: root })).toBe(1);
  });

  it("scaffolds an iteration at the prefix it is given", async () => {
    const argv = ["iteration", "engine/probe", "--at", "2026-09-14-1703"];

    expect(await run({ argv, cwd: root })).toBe(0);
    expect(await readdir(join(root, content, "engine", "iterations"))).toEqual([
      "2026-09-14-1703-probe",
    ]);
  });

  it("refuses a prefix it is given when that iteration exists, rather than suffixing it", async () => {
    const argv = ["iteration", "engine/probe", "--at", "2026-09-14-1703"];

    await run({ argv, cwd: root });

    expect(await run({ argv, cwd: root })).toBe(1);
  });

  it("refuses a prefix of another shape", async () => {
    const argv = ["iteration", "engine/probe", "--at", "2026-09-14"];

    expect(await run({ argv, cwd: root })).toBe(1);
  });

  it("refuses an unknown kind rather than guessing", async () => {
    expect(await run({ argv: ["nonsense", "engine/probe"], cwd: root })).toBe(1);
  });
});
