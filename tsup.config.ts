import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    target: "es2020",
    outDir: "dist",
  },
  {
    entry: ["src/react/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    target: "es2020",
    outDir: "dist/react",
    external: ["react"],
  },
]);
