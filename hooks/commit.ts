import { homedir } from "node:os";
import { resolve } from "node:path";

const word = String.raw`(?:"[^"]*"|'[^']*'|[^\s;&|]+)`;

// A command starts a line as well as a chain: the line after a heredoc is a command of its own.
const start = String.raw`(^|[;&|\n({]\s*)`;

// A wrapper runs git as its argument, and an assignment only sets its environment. `rtk` is
// the token filter some sessions are told to put before every command.
const wrappers = String.raw`(?:(?:rtk|env|command|exec|sudo|nice|time|[A-Za-z_]\w*=${word})\s+)*`;

// `-C <dir>` and `-c <key=value>` take their value as a separate word: an option pattern that
// only knows `-x` words would not see the commit behind them, and the hooks would let it pass.
export const commitCommand = new RegExp(
  String.raw`${start}${wrappers}git(?:\.exe)?\s+(?:(?:-[Cc]\s+${word}|-[^\s]+)\s+)*commit\b`,
);

// The PowerShell tool moves with Set-Location and its aliases, optionally naming the parameter.
const changeDirectory = new RegExp(
  String.raw`(?:^|[;&|\n({]\s*)(?:cd|chdir|pushd|sl|set-location|push-location)\s+(?:-(?:literal)?path\s+)?(${word})`,
  "gi",
);
const gitDirectory = new RegExp(String.raw`-C\s+(${word})`, "g");

const unquoted = (value: string) => value.replace(/^(["'])(.*)\1$/, "$2");

// The Bash tool is Git Bash on Windows, which spells `C:\` as `/c/`: Node would read it as a
// directory named `c` at the root of the current drive.
const native = (path: string) => {
  const home = path.replace(/^~(?=\/|$)/, homedir());

  return process.platform === "win32" ? home.replace(/^\/([a-zA-Z])(?=\/|$)/, "$1:") : home;
};

const follow = ({ from, to }: { from: string; to: string }) => resolve(from, native(unquoted(to)));

// A hook runs in the session's directory, but `cd ../worktrees/x && git commit` commits in the
// worktree: asking git about the session's directory would judge the wrong branch.
export const commitDirectory = ({ command, cwd }: { command: string; cwd: string }): string => {
  const commit = commitCommand.exec(command);

  if (!commit) return cwd;

  const before = command.slice(0, commit.index + (commit[1] ?? "").length);
  const moved = [...before.matchAll(changeDirectory)].reduce(
    (from, match) => follow({ from, to: match[1] as string }),
    cwd,
  );

  return [...commit[0].matchAll(gitDirectory)].reduce(
    (from, match) => follow({ from, to: match[1] as string }),
    moved,
  );
};
