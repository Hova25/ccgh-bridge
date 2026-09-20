import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentRoot, repositoryRoot } from "../project";

export type Plan = {
  mode: "dev" | "build";
  content: string;
  cacheDir: string;
  buildDir: string;
  outDir: string;
  port?: string;
};

const plugin = fileURLToPath(new URL("../..", import.meta.url));

export const plan = ({ argv, cwd }: { argv: string[]; cwd: string }): Plan => {
  const repository = repositoryRoot({ from: cwd });
  const port = argv.includes("--port") ? argv[argv.indexOf("--port") + 1] : undefined;

  // The content store belongs to the repository being read: left where Astro puts it, it would
  // sit beside the site, in the plugin's own directory, shared by every project on this
  // machine — and a store built from one repository served to another reads as stale content
  // rather than as the wrong repository.
  //
  // The build is the opposite. Astro writes a prerender entry point into its output directory
  // and then runs it, so that directory must have `node_modules` above it or Node resolves
  // nothing. It builds under the plugin, keyed by repository so two never collide, and `run`
  // moves the finished site into `.ccgh/site` afterwards.
  return {
    mode: argv.includes("--build") ? "build" : "dev",
    content: contentRoot({ from: cwd }),
    cacheDir: join(repository, ".ccgh", "cache"),
    buildDir: join(plugin, ".ccgh-build", Bun.hash(repository).toString(36)),
    outDir: join(repository, ".ccgh", "site"),
    ...(port ? { port } : {}),
  };
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const { mode, content, cacheDir, buildDir, outDir, port } = plan({ argv, cwd });

  if (!existsSync(content)) {
    process.stderr.write(`no content directory at ${content}\n`);

    return 1;
  }

  if (!existsSync(join(plugin, "node_modules", "astro"))) {
    process.stderr.write("astro is not installed: run the plugin's install again\n");

    return 1;
  }

  const written = join(repositoryRoot({ from: cwd }), ".ccgh");

  if (!existsSync(written)) {
    process.stdout.write(`${written} is about to be written: add .ccgh/ to .gitignore\n`);
  }

  const child = Bun.spawn(
    ["bun", "x", "astro", mode, "--root", join(plugin, "site"), ...(port ? ["--port", port] : [])],
    {
      // Astro must run from the plugin, not from the repository being read: it writes a
      // prerender entry point next to the working directory and then runs it, and Node
      // resolves that file's imports from where it sits. Written into a repository that has no
      // node_modules, nothing resolves.
      cwd: plugin,
      // The environment rather than flags: the loader's base is read inside content.config.ts,
      // where no command line reaches.
      env: {
        ...process.env,
        CCGH_CONTENT: content,
        CCGH_CACHE_DIR: cacheDir,
        CCGH_OUT_DIR: buildDir,
      },
      stdio: ["inherit", "inherit", "inherit"],
    },
  );

  const code = await child.exited;

  if (mode === "build" && code === 0) {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(join(outDir, ".."), { recursive: true });
    await cp(buildDir, outDir, { recursive: true });
    await rm(buildDir, { recursive: true, force: true });

    process.stdout.write(`site written to ${outDir}\n`);
  }

  return code;
};
