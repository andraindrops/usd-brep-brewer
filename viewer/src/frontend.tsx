/**
 * Entry point: reads the job and camera from the URL (?job=<id>&...), loads its glb, then renders once.
 * Included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { JobShow } from "@/components/app/job/show";
import { loadModel } from "@/services/job";
import { parseCameraParams } from "@/utils/camera";
import "@/index.css";

// prettier-ignore
const query  = new URLSearchParams(location.search);
const camera = parseCameraParams(query);
// prettier-ignore
const id     = query.get("job");
// prettier-ignore
const model  = id ? await loadModel(id) : null;

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <JobShow id={id} model={model} camera={camera} />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
