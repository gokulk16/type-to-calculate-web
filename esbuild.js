import * as esbuild from "esbuild";
import copyStaticFiles from "esbuild-copy-static-files";
import * as fsExtra from "fs-extra";

fsExtra.emptyDirSync("./dist");

esbuild.build({
  entryPoints: ["./js/editor.js"],
  outdir: "dist/js",
  bundle: true,
  minify: true,
  sourcemap: false,
  mainFields: ["module", "main"],
  plugins: [
    copyStaticFiles({
      src: "./css",
      dest: "dist/css",
      dereference: true,
      errorOnExist: false,
      preserveTimestamps: false,
      recursive: true,
    }),
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
  ],
});
