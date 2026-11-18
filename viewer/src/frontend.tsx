/**
 * Entry point: reads the job, selection and camera from the URL (?job=<id>&...), loads its glb, then renders once.
 * Picking a component or part in the list navigates to a new URL.
 * Included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { JobShow } from "@/components/app/job/show";
import { loadModel } from "@/services/job";
import { parseCameraParams } from "@/utils/camera";
import { applySelection, selectedParts } from "@/utils/parts";
import "@/index.css";

// prettier-ignore
const query  = new URLSearchParams(location.search);
const camera = parseCameraParams(query);
// prettier-ignore
const id     = query.get("job");
// prettier-ignore
const model  = id ? await loadModel(id) : null;
// the gizmo draws its labels to a canvas once, so the font must be ready first
await document.fonts.load("500 18px 'M PLUS 1 Code'");
// ?component=<name> or ?part=<name>: show only those parts, dim the rest
// prettier-ignore
const selected = model && selectedParts(model.parts, query);
// prettier-ignore
const box      = model && applySelection(model, selected);

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <JobShow id={id} model={model} camera={camera} box={box} selected={selected} />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
