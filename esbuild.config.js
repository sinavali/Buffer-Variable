const esbuild = require("esbuild");

const commonOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  minify: true,
  platform: "neutral",
  target: ['es2020', 'node16'],
  tsconfig: "tsconfig.json",
};

Promise.all([
  // Node.js CommonJS
  esbuild.build({
    ...commonOptions,
    outfile: "dist/index.cjs.js",
    format: "cjs",
    platform: "node",
  }),
  // Node.js ESM
  esbuild.build({
    ...commonOptions,
    outfile: "dist/index.esm.js",
    format: "esm",
    platform: "neutral",
  }),
  // Browser UMD
  esbuild.build({
    ...commonOptions,
    outfile: "dist/buffer-variables.umd.js",
    format: "iife",
    globalName: "bufferVariables",
    platform: "browser",
  }),
]).catch(() => process.exit(1));
