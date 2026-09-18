import { mkdir, writeFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { generateIcons } from "./icons.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const watch = process.argv.includes("--watch");

async function copyStatic() {
  await mkdir(distDirectory, { recursive: true });
  await mkdir(new URL("../dist/icons/", import.meta.url), { recursive: true });
  await generateIcons(fileURLToPath(new URL("../dist/icons/", import.meta.url)));
  await Promise.all([
    cp(
      new URL("../manifest.json", import.meta.url),
      new URL("../dist/manifest.json", import.meta.url),
    ),
    cp(
      new URL("../src/content.css", import.meta.url),
      new URL("../dist/content.css", import.meta.url),
    ),
  ]);
}

const common = {
  absWorkingDir: projectRoot,
  bundle: true,
  legalComments: "none",
  minify: !watch,
  platform: "browser",
  sourcemap: watch ? "inline" : false,
  target: ["chrome120"],
};

await copyStatic();

const builds = [
  {
    ...common,
    entryPoints: ["src/content/index.ts"],
    format: "iife",
    outfile: "dist/content.js",
  },
  {
    ...common,
    entryPoints: ["src/background.ts"],
    format: "iife",
    outfile: "dist/background.js",
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));
  await Promise.all(contexts.map((context) => context.watch()));
  console.log("Watching. Reload the unpacked extension in chrome://extensions after changes.");
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  console.log("Built to dist/. Load that folder as an unpacked extension.");
}
