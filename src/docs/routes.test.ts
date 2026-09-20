import { describe, expect, it } from "bun:test";
import { locate } from "../model/paths";
import { breadcrumbFor, urlFor } from "./routes";

const at = (file: string) => {
  const location = locate(file);

  if (!location) throw new Error(`no known shape for ${file}`);

  return location;
};

const fix = {
  kind: "fix" as const,
  domain: "harness",
  iteration: null,
  reference: null,
  file: "harness/fixes/2026-09-14-mirror-the-milestone.md",
};

describe("urlFor", () => {
  it("builds the URL of a fix", () => {
    expect(urlFor(fix)).toBe("/harness/fixes/2026-09-14-mirror-the-milestone");
  });

  it("breadcrumbs a fix through its domain", () => {
    expect(breadcrumbFor(fix).map((crumb) => crumb.label)).toEqual([
      "Home",
      "harness",
      "2026-09-14-mirror-the-milestone",
    ]);
  });

  it("addresses a domain", () => {
    expect(urlFor(at("harness/index.md"))).toBe("/harness");
  });

  it("addresses an iteration", () => {
    expect(urlFor(at("harness/iterations/2026-09-13-1529-bootstrap/spec.md"))).toBe(
      "/harness/2026-09-13-1529-bootstrap",
    );
  });

  it("addresses a brainstorm", () => {
    expect(urlFor(at("harness/iterations/2026-09-13-1529-bootstrap/brainstorm.md"))).toBe(
      "/harness/2026-09-13-1529-bootstrap/brainstorm",
    );
  });

  it("addresses a task by its file name without the extension", () => {
    expect(
      urlFor(at("harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md")),
    ).toBe("/harness/2026-09-13-1529-bootstrap/01-content-schemas");
  });

  it("addresses a guide page and a decision record", () => {
    expect(urlFor(at("harness/guide/workflow.md"))).toBe("/harness/guide/workflow");
    expect(urlFor(at("harness/decisions/001-commit-the-configuration.md"))).toBe(
      "/harness/decisions/001-commit-the-configuration",
    );
  });
});

describe("breadcrumbFor", () => {
  it("climbs from a task back to the root", () => {
    expect(
      breadcrumbFor(at("harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md")),
    ).toEqual([
      { label: "Home", href: "/" },
      { label: "harness", href: "/harness" },
      { label: "2026-09-13-1529-bootstrap", href: "/harness/2026-09-13-1529-bootstrap" },
      {
        label: "01-content-schemas",
        href: "/harness/2026-09-13-1529-bootstrap/01-content-schemas",
      },
    ]);
  });

  it("stops at the domain for a domain page", () => {
    expect(breadcrumbFor(at("harness/index.md"))).toEqual([
      { label: "Home", href: "/" },
      { label: "harness", href: "/harness" },
    ]);
  });

  it("carries the base a published site is served under", () => {
    process.env.CCGH_BASE = "/repo/";

    expect(urlFor(fix)).toBe("/repo/harness/fixes/2026-09-14-mirror-the-milestone");
    expect(breadcrumbFor(fix)[0]?.href).toBe("/repo/");

    delete process.env.CCGH_BASE;
  });
});
