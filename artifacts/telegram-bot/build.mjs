import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build as esbuild } from "esbuild";
import { rm, mkdir, copyFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
      "pg-native",
      "bufferutil",
      "utf-8-validate",
    ],
    sourcemap: "linked",
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
      `,
    },
  });

  // Copy bundled logo so the bot can send it as a local file fallback.
  const logoSrc = path.resolve(artifactDir, "../nexoshop/public/nexoshop-icon.png");
  const logoDst = path.resolve(distDir, "logo.png");
  try {
    await copyFile(logoSrc, logoDst);
  } catch {
    // optional asset, ignore if missing
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
