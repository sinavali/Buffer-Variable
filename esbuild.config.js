/**
 * esbuild configuration for @fbb-org/buffer-variables.
 * Bundles ESM, CommonJS, and UMD outputs. Type declarations are handled by tsc.
 * @module esbuild-config
 */
const esbuild = require("esbuild");

async function build() {
  try {
    const common = {
      entryPoints: ["src/index.ts"],
      bundle: true,
      sourcemap: true,
      minify: true,
      target: ["es2020", "node16"],
    };

    await Promise.all([
      esbuild.build({
        ...common,
        format: "esm",
        outfile: "dist/index.esm.js",
        platform: "neutral",
      }),
      esbuild.build({
        ...common,
        format: "cjs",
        outfile: "dist/index.cjs.js",
        platform: "node",
      }),
      esbuild.build({
        ...common,
        format: "iife",
        outfile: "dist/buffer-variables.umd.js",
        platform: "browser",
        globalName: "BufferVariables",
      }),
    ]);

    console.log("Build completed successfully.");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
