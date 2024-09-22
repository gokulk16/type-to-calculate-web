import fs from "fs";

const copyFilePlugin = (fileSrcPath, fileDestPath) => ({
  name: "copy-file-plugin",
  setup(build) {
    build.onEnd(async () => {
      try {
        fs.copyFileSync(fileSrcPath, fileDestPath);
      } catch (e) {
        console.error(`Failed to copy file: ${fileSrcPath}`, e);
      }
    });
  },
});

export default copyFilePlugin;
