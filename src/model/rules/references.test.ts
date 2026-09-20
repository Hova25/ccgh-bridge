import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../validate";
import { checkReferences } from "./references";

const iteration = ({
  domain,
  slug,
  data,
}: {
  domain: string;
  slug: string;
  data: Record<string, unknown>;
}): ParsedEntry => {
  return {
    location: {
      kind: "iteration",
      domain,
      iteration: slug,
      reference: `${domain}/${slug}`,
      file: `${domain}/iterations/${slug}/spec.md`,
    },
    data: { title: "T", status: "draft", depends_on: [], impacts: [], ...data },
    body: "",
  };
};

const domainIndex = (domain: string): ParsedEntry => {
  return {
    location: {
      kind: "domain",
      domain,
      iteration: null,
      reference: null,
      file: `${domain}/index.md`,
    },
    data: { title: domain, summary: domain },
    body: "",
  };
};

describe("checkReferences", () => {
  it("accepts a dependency that resolves", () => {
    const entries = [
      iteration({ domain: "auth", slug: "2026-09-13-login", data: {} }),
      iteration({
        domain: "billing",
        slug: "2026-10-01-checkout",
        data: { depends_on: ["auth/2026-09-13-login"] },
      }),
    ];

    expect(checkReferences(entries)).toEqual([]);
  });

  it("reports a dependency pointing at nothing", () => {
    const entries = [
      iteration({
        domain: "billing",
        slug: "2026-10-01-checkout",
        data: { depends_on: ["auth/2026-09-13-login"] },
      }),
    ];

    expect(checkReferences(entries)).toEqual([
      {
        file: "billing/iterations/2026-10-01-checkout/spec.md",
        message: "depends_on: auth/2026-09-13-login does not exist",
      },
    ]);
  });

  it("reports an impacted domain that does not exist", () => {
    const entries = [
      domainIndex("auth"),
      iteration({ domain: "auth", slug: "2026-09-13-login", data: { impacts: ["billing"] } }),
    ];

    expect(checkReferences(entries)).toEqual([
      {
        file: "auth/iterations/2026-09-13-login/spec.md",
        message: "impacts: billing does not exist",
      },
    ]);
  });

  it("reports an iteration impacting its own domain", () => {
    const entries = [
      domainIndex("auth"),
      iteration({ domain: "auth", slug: "2026-09-13-login", data: { impacts: ["auth"] } }),
    ];

    expect(checkReferences(entries)[0]?.message).toMatch(/owns/);
  });

  it("reports an iteration depending on itself", () => {
    const entries = [
      iteration({
        domain: "auth",
        slug: "2026-09-13-login",
        data: { depends_on: ["auth/2026-09-13-login"] },
      }),
    ];

    expect(checkReferences(entries)[0]?.message).toMatch(/itself/);
  });
});
