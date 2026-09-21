import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./refuse-bash-writes-to-content";

const content = "docs/ccgh-bridge";
const run = (command: string) =>
  decide({ input: { tool_input: { command } }, context: fake({ content: () => content }) });

describe("refuse-bash-writes-to-content", () => {
  it("refuses a heredoc into a content file", () => {
    expect(run(`cat > ${content}/harness/fixes/2026-09-14-a.md <<'MD'\ntext\nMD`)).toMatch(
      /redirection/,
    );
  });

  it("refuses an append", () => {
    expect(run(`echo x >> ${content}/harness/guide/conventions.md`)).toMatch(/redirection/);
  });

  it("refuses tee", () => {
    expect(run(`echo x | tee ${content}/harness/index.md`)).toMatch(/tee/);
  });

  it("refuses an in-place sed", () => {
    expect(run(`sed -i '' s/a/b/ ${content}/harness/index.md`)).toMatch(/in-place/);
  });

  it("refuses cp into the content tree", () => {
    expect(run(`cp /tmp/a.md ${content}/harness/fixes/2026-09-14-a.md`)).toMatch(/cp or mv/);
  });

  it("refuses PowerShell cmdlets writing into the content tree", () => {
    expect(run(`Set-Content -Path ${content}/harness/index.md -Value x`)).toMatch(/PowerShell/);
    expect(run(`"x" | Out-File docs\\ccgh-bridge\\harness\\index.md`)).toMatch(/PowerShell/);
    expect(run(`Copy-Item C:\\tmp\\a.md docs\\ccgh-bridge\\harness\\a.md`)).toMatch(/PowerShell/);
    expect(run(`"x" > docs\\ccgh-bridge\\harness\\index.md`)).toMatch(/redirection/);
  });

  it("allows PowerShell reading a content file", () => {
    expect(run(`Get-Content docs\\ccgh-bridge\\harness\\index.md -TotalCount 5`)).toBeNull();
  });

  it("allows reading a content file", () => {
    expect(run(`grep -i status ${content}/harness/index.md`)).toBeNull();
    expect(run(`cat ${content}/harness/index.md | head -5`)).toBeNull();
  });

  it("allows git commands naming content paths", () => {
    expect(run(`git add ${content}`)).toBeNull();
    expect(run(`git checkout HEAD -- ${content}/harness/index.md`)).toBeNull();
    expect(run(`git diff --name-only > /dev/null`)).toBeNull();
  });

  it("allows writing outside the content tree", () => {
    expect(run("cat > apps/development-documentation/src/site/routes.ts <<'TS'\nx\nTS")).toBeNull();
  });

  it("follows the content root a repository configures, not one written into the rule", () => {
    const decision = decide({
      input: { tool_input: { command: "echo x >> elsewhere/engine/index.md" } },
      context: fake({ content: () => "elsewhere" }),
    });

    expect(decision).toMatch(/redirection/);
  });
});
