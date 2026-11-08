import { readdir, readFile } from "fs/promises";
import { parse, dirname, join } from "path";
import { fileURLToPath } from "url";
import { build, BuildOptions } from "esbuild";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const buildConfig: BuildOptions = {
  define: {
    "process.env.DEBUG": "undefined",
    "process.env.JEST_WORKER_ID": "1",
    __OXIDE__: "undefined",
    __dirname: '"/"',
  },
  supported: {
    "nullish-coalescing": false,
    "optional-chain": false,
  },
  external: ["svgo"],
  plugins: [
    {
      name: "alias",
      async setup({ onLoad, onResolve, resolve }) {
        const stubFiles = await readdir("src/stubs", { withFileTypes: true });
        const stubNames = stubFiles
          .filter((file) => file.isFile())
          .map((file) => parse(file.name).name);

        onResolve({ filter: new RegExp(`^(${stubNames.join("|")})$`) }, ({ path }) => ({
          path: fileURLToPath(new URL(`stubs/${path}.ts`, import.meta.url)),
          sideEffects: false,
        }));

        onResolve({ filter: /^@tailwindcss\/oxide/ }, ({ path }) => ({
          path: fileURLToPath(new URL(`stubs/${path}.ts`, import.meta.url)),
          sideEffects: false,
        }));

        // Let tailwindcss resolve normally - we want the real v4 APIs

        onResolve({ filter: /^tailwindcss\/lib/ }, ({ path, ...options }) =>
          resolve(path.replace("lib", "src"), options)
        );

        onResolve({ filter: /^\.+\/(util\/)?log$/, namespace: "file" }, ({ path, ...options }) => {
          if (options.importer.includes("tailwindcss")) {
            return {
              path: fileURLToPath(new URL("stubs/tailwindcss/utils/log.ts", import.meta.url)),
              sideEffects: false,
            };
          }
          return resolve(path, {
            ...options,
            namespace: "noRecurse",
          });
        });

        onResolve({ filter: /^postcss-selector-parser\/.*\/\w+$/ }, ({ path, ...options }) =>
          resolve(`${path}.js`, options)
        );

        onLoad({ filter: /tailwindcss\/src\/css\/preflight\.css$/ }, async ({ path }) => {
          const result = await build({
            entryPoints: [path],
            minify: true,
            logLevel: "silent",
            write: false,
          });
          return { contents: result.outputFiles[0].text, loader: "text" };
        });

        onLoad({ filter: /\/tailwindcss\/stubs\/defaultConfig\.stub\.js$/ }, async ({ path }) => {
          const cjs = await readFile(path, "utf8");
          const esm = cjs.replace("module.exports =", "export default");
          return { contents: esm };
        });

        // Bundle Tailwind v4 CSS content for browser builds
        onLoad({ filter: /tailwind-v4-css\.ts$/ }, async ({ path }) => {
          try {
            // Read the actual Tailwind v4 index.css
            const tailwindPath = dirname(require.resolve("tailwindcss/package.json"));
            const indexCSSPath = join(tailwindPath, "index.css");
            const indexCSS = await readFile(indexCSSPath, "utf8");
            
            // Create the module content with escaped CSS
            const escapedCSS = indexCSS
              .replace(/\\/g, '\\\\')
              .replace(/`/g, '\\`')
              .replace(/\${/g, '\\${');
            
            const moduleContent = `// Auto-generated: Bundled Tailwind v4 CSS content
export const TAILWIND_V4_CSS = \`${escapedCSS}\`;`;
            
            return { contents: moduleContent };
            
          } catch (error: any) {
            console.warn('Could not bundle Tailwind CSS content:', error?.message || error);
            // Return empty CSS as fallback
            return { contents: 'export const TAILWIND_V4_CSS = "";' };
          }
        });

      },
    },
  ],
};

// COMMONJS
build({
  entryPoints: { "index.cjs": "src/builds/module.ts" },
  bundle: true,
  minify: true,
  logLevel: "info",
  outfile: "dist/index.cjs",
  format: "cjs",
  ...buildConfig,
});

// MODULE
build({
  entryPoints: { "index.mjs": "src/builds/module.ts" },
  bundle: true,
  minify: true,
  logLevel: "info",
  outfile: "dist/index.mjs",
  format: "esm",
  ...buildConfig,
});

// CDN
build({
  entryPoints: { "cdn.min": "src/builds/cdn.ts" },
  bundle: true,
  minify: true,
  logLevel: "info",
  outdir: "dist",
  format: "iife",
  ...buildConfig,
});

// NODE.JS - COMMONJS
build({
  entryPoints: { "node.cjs": "src/node.ts" },
  bundle: true,
  minify: true,
  logLevel: "info",
  outfile: "dist/node.cjs",
  format: "cjs",
  platform: "node",
  ...buildConfig,
});

// NODE.JS - MODULE
build({
  entryPoints: { "node.mjs": "src/node.ts" },
  bundle: true,
  minify: true,
  logLevel: "info",
  outfile: "dist/node.mjs",
  format: "esm",
  platform: "node",
  ...buildConfig,
});