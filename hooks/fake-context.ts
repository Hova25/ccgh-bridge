import type { Context } from "./context";

// A world that answers only what a test described. Reaching for anything else fails loudly,
// so a rule cannot quietly start depending on something no test ever gave it — which is how
// a rule that looked pure turns out to shell out.
export const fake = (given: Partial<Context>): Context =>
  new Proxy(given, {
    get: (target, key) => {
      if (key in target) return target[key as keyof Context];

      throw new Error(`the rule read ${String(key)}, which this test did not describe`);
    },
  }) as Context;
