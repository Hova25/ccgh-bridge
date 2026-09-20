// What a rule may ask about the world. Task 4 wires it to the real shell; a test passes a
// literal, which is what lets a rule about `git commit` be decided without a `git commit`.
export type Context = {
  currentBranch: () => string;
  stagedFiles: () => string[];
  check: (input: { files: string[] }) => string;
  // The content directory, relative to the repository root. The engine resolves it; a rule
  // receives it already resolved so that it never reads a file system to make a decision.
  content: () => string;
  fileExists: (file: string) => boolean;
};

export type HookInput = {
  tool_name?: string;
  tool_input?: {
    command?: string;
    file_path?: string;
    content?: string;
    new_string?: string;
  };
};

export type Decide = (input: { input: HookInput; context: Context }) => string | null;
