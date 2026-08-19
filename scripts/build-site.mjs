import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const routeRoot = join(projectRoot, "dist", "y2k-type-lab");

const files = [
  "index.html",
  "art-text.css",
  "art-text.js",
  "art-text-fields.js",
  "art-text-presets.js",
];

const assetDirectories = [
  "assets/fonts",
  "assets/material-previews",
  "assets/reflection-fields",
];

await rm(join(projectRoot, "dist"), { recursive: true, force: true });
await mkdir(routeRoot, { recursive: true });

await Promise.all(
  files.map((file) => cp(join(projectRoot, file), join(routeRoot, file))),
);

await Promise.all(
  assetDirectories.map((directory) =>
    cp(join(projectRoot, directory), join(routeRoot, directory), {
      recursive: true,
    }),
  ),
);

console.log("Built /y2k-type-lab/ for Cloudflare Workers static assets.");
