import { defineConfig } from "astro/config";

// Every path here is decided by `ccgh docs`, which knows which repository is being read. The
// site itself lives in the plugin and must write nothing beside itself.
export default defineConfig({
  cacheDir: process.env.CCGH_CACHE_DIR,
  outDir: process.env.CCGH_OUT_DIR,
});
