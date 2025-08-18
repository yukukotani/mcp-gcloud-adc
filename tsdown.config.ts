import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm"],
  target: "esnext",
  platform: "node",
  dts: true,
  minify: false,
  sourcemap: true,
  outDir: "dist",
  clean: true,
  skipNodeModulesBundle: true,
});