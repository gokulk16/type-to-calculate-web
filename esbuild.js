const esbuild = require("esbuild");
const copyStaticFiles = require("esbuild-copy-static-files");

const fsExtra = require("fs-extra");
fsExtra.emptyDirSync("./dist");

esbuild.build({
  entryPoints: ["./js/editor.js"],
  outdir: "dist/js",
  bundle: true,
  minify: true,
  sourcemap: false,
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
