#!/usr/bin/env node
// usd-brep-brewer CLI
//
//   usd-brep-brewer view        serve the viewer for ./jobs
//   usd-brep-brewer new <id>    create jobs/<id>/gen.py from the template
//   usd-brep-brewer run <id>    gen.py (sandboxed) -> export.py -> summary + viewer URL
//
// Input:  jobs/<id>/gen.py   (must write /work/out.usda)
// Output: jobs/<id>/{out.usda, gen.log, out.glb, out.stl, report.json}
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = JSON.parse(readFileSync(path.join(PKG, "package.json"), "utf8")).version;
const JOBS_DIR = path.resolve(process.env.JOBS_DIR ?? "jobs");
const VIEWER_URL = process.env.VIEWER_URL ?? "http://localhost:3000";
const IMAGE = `usd-brep-runner:${VERSION}`;
const JOB_ID = /^[\w.-]+$/;
const JOB_FILES = ["out.glb", "report.json", "gen.py", "out.usda"];
const USAGE = "usage: usd-brep-brewer view | new <job-id> | run <job-id>";

function jobDir(id) {
  if (!id || !JOB_ID.test(id)) {
    console.error(USAGE);
    process.exit(2);
  }
  return path.join(JOBS_DIR, id);
}

function view() {
  const DIST = path.join(PKG, "viewer/dist");
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".glb": "model/gltf-binary" };
  const send = (res, file) => {
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
    createReadStream(file).pipe(res);
  };
  const isFile = (f) => existsSync(f) && statSync(f).isFile();

  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const api = pathname.match(/^\/api\/jobs\/([^/]+)\/([^/]+)$/);
    if (api) {
      const [, id, file] = api;
      const f = path.join(JOBS_DIR, id, file);
      if (!JOB_ID.test(id) || !JOB_FILES.includes(file) || !isFile(f)) return res.writeHead(404).end("Not found");
      return send(res, f);
    }
    // static assets; everything else falls back to index.html
    const f = path.join(DIST, pathname);
    send(res, f.startsWith(DIST + path.sep) && isFile(f) ? f : path.join(DIST, "index.html"));
  });
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`viewer running at http://localhost:${port} (jobs: ${JOBS_DIR})`));
}

function create(id) {
  const job = jobDir(id);
  const gen = path.join(job, "gen.py");
  if (existsSync(gen)) {
    console.error(`already exists: ${gen}`);
    process.exit(1);
  }
  mkdirSync(job, { recursive: true });
  copyFileSync(path.join(PKG, "template/gen.py"), gen);
  console.log(`created ${path.relative(process.cwd(), gen)}`);
  console.log(`run: usd-brep-brewer run ${id}`);
}

function docker(job, args, log) {
  return new Promise((resolve) => {
    const p = spawn("docker", ["run", "--rm", "--network", "none", "--memory", "2g", "--cpus", "2", "-v", `${job}:/work`, IMAGE, "timeout", "60", ...args]);
    let blank = false;
    const onLine = (line) => {
      // the bundled USD tries to load pxr python bindings it does not ship; drop that noise
      if (/_LoadLibModules|No module named 'pxr'/.test(line)) return;
      if (line.trim() === "" && blank) return;
      blank = line.trim() === "";
      console.log(line);
      if (log) log.push(line);
    };
    createInterface({ input: p.stdout }).on("line", onLine);
    createInterface({ input: p.stderr }).on("line", onLine);
    p.on("error", (e) => {
      console.error(`failed to run docker: ${e.message}`);
      resolve(127);
    });
    p.on("close", (code) => resolve(code ?? 1));
  });
}

function summary(file) {
  if (!existsSync(file)) return console.log("== FAILED: export did not write report.json");
  const r = JSON.parse(readFileSync(file, "utf8"));
  const g = (v) => String(Number(v.toPrecision(6)));
  console.log("ok:", r.ok);
  if (r.bounds) console.log("bounds:", JSON.stringify(r.bounds.min), "->", JSON.stringify(r.bounds.max), "size", JSON.stringify(r.bounds.size));
  for (const b of r.breps) {
    const i = b.info;
    console.log(`brep ${b.index}: faces ${i.faces} edges ${i.edges} vertices ${i.vertices} manifold ${i.manifold} volume ${g(i.volume)} failed_faces ${b.failed_faces.length}`);
  }
  for (const e of r.errors) console.log("error:", typeof e === "string" ? e : `${e.type}: ${e.message}`);
}

async function run(id) {
  const job = jobDir(id);
  if (!existsSync(path.join(job, "gen.py"))) {
    console.error(`missing ${path.join(job, "gen.py")} (create it: usd-brep-brewer new ${id})`);
    process.exit(2);
  }

  if (spawnSync("docker", ["image", "inspect", IMAGE], { stdio: "ignore" }).status !== 0) {
    console.log(`== building ${IMAGE} (first run only)`);
    const b = spawnSync("docker", ["build", "-q", "-t", IMAGE, path.join(PKG, "runner")], { stdio: ["ignore", "ignore", "inherit"] });
    if (b.status !== 0) {
      console.error(b.error ? `failed to run docker: ${b.error.message}` : "== FAILED: docker build");
      process.exit(1);
    }
  }

  for (const f of ["out.usda", "gen.log", "out.glb", "out.stl", "report.json"]) rmSync(path.join(job, f), { force: true });

  console.log("== gen.py");
  const log = [];
  const status = await docker(job, ["python", "/work/gen.py"], log);
  if (status === 124) {
    console.log("gen.py timed out (60s)");
    log.push("gen.py timed out (60s)");
  }
  writeFileSync(path.join(job, "gen.log"), log.join("\n") + "\n");
  if (status !== 0) {
    console.log(`== FAILED: gen.py exited ${status} (log: jobs/${id}/gen.log)`);
    process.exit(1);
  }
  if (!existsSync(path.join(job, "out.usda"))) {
    console.log("== FAILED: gen.py did not write /work/out.usda");
    process.exit(1);
  }

  console.log("== export");
  const exportStatus = await docker(job, ["python", "/opt/runner/export.py", "/work"]);

  console.log("== report");
  summary(path.join(job, "report.json"));
  await fetch(`${VIEWER_URL}/`, { signal: AbortSignal.timeout(1000) }).catch(() => console.log("viewer is not running: usd-brep-brewer view"));
  console.log(`view: ${VIEWER_URL}/?job=${id}`);
  process.exit(exportStatus);
}

const [cmd, id] = process.argv.slice(2);
if (cmd === "view") view();
else if (cmd === "new") create(id);
else if (cmd === "run") await run(id);
else {
  console.error(USAGE);
  process.exit(2);
}
