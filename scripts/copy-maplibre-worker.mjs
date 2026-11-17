#!/usr/bin/env node
// Copies MapLibre's self-contained worker module into /public so it can be served
// same-origin (bundlers cannot resolve MapLibre 6's import.meta.url worker lookup).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const out = resolve(root, "public/vendor");
mkdirSync(out, { recursive: true });
copyFileSync(resolve(pkgDir, "dist/maplibre-gl-worker.mjs"), resolve(out, "maplibre-gl-worker.mjs"));
console.log("Copied maplibre-gl-worker.mjs → public/vendor/");
