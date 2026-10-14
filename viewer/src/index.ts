import { serve } from "bun";
import path from "node:path";

import index from "@/index.html";
import type { JobFile } from "@/types/job";

// prettier-ignore
const JOBS_DIR  = path.resolve(process.env.JOBS_DIR ?? path.join(import.meta.dir, "../../jobs"));
// prettier-ignore
const JOB_ID    = /^[\w.-]+$/;
const JOB_FILES = ["out.glb", "report.json", "gen.py", "out.usda"] satisfies JobFile[];

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/jobs/:id/:file": async (req) => {
      const { id, file } = req.params;
      if (!JOB_ID.test(id) || !(JOB_FILES as string[]).includes(file)) {
        return new Response("Not found", { status: 404 });
      }
      const f = Bun.file(path.join(JOBS_DIR, id, file));
      if (!(await f.exists())) return new Response("Not found", { status: 404 });
      return new Response(f, { headers: { "Cache-Control": "no-cache" } });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url} (jobs: ${JOBS_DIR})`);
