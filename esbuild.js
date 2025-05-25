import * as esbuild from "esbuild";
import copyStaticFiles from "esbuild-copy-static-files";
import * as fsExtra from "fs-extra";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import copyFilePlugin from "./esbuild-helper/copy-file-plugin.js";

fsExtra.emptyDirSync("./dist");

esbuild.build({
  entryPoints: [
    "./js/editor.js",
    "./js/loader.js",
    "./js/styles.js" // Add styles entry for CSS bundling
  ],
  outdir: "dist/js",
  bundle: true,
  minify: true,
  sourcemap: true, // Source map needed for sentry to work
  mainFields: ["module", "main"],
  plugins: [
    copyFilePlugin("./manifest.json", "./dist/manifest.json"),
    copyFilePlugin("./sw.js", "./dist/sw.js"),
    copyStaticFiles({
      src: "./assets",
      dest: "dist/assets",
      dereference: true,
      errorOnExist: false,
      preserveTimestamps: false,
      recursive: true,
    }),
    copyStaticFiles({
      src: "./html",
      dest: "dist/",
      dereference: true,
      errorOnExist: false,
      preserveTimestamps: false,
      recursive: true,
    }),
    sentryEsbuildPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "typetocalculate",
      project: "javascript",
    }),
  ],
  loader: {
    '.css': 'css',
    '.png': 'file',
  },

});

// update sw.js to trigger PWA updates for the installed applications

// --- Update APP_VERSION in sw.js with today's date before build ---
import fs from "fs";
const swPath = './sw.js';
const swContent = fs.readFileSync(swPath, 'utf8');
const today = new Date().toISOString().slice(0, 10);
const versionRegex = /const APP_VERSION_DATE = "([^"]+)"/;
const newSwContent = swContent.replace(versionRegex, (match, p1) => {
  // Only append if not already appended
  if (p1.endsWith(`${today}`)) return match;
  return `const APP_VERSION_DATE = "${today}"`;
});
if (swContent !== newSwContent) {
  fs.writeFileSync(swPath, newSwContent, 'utf8');
  console.log(`APP_VERSION updated in sw.js to include ${today}`);
}

