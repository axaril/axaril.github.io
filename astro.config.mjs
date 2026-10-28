import { defineConfig } from "astro/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Browsers refuse to load module scripts over file://, so self-contained bundles
// (no import/export) are loaded as classic deferred scripts instead.
const moduleSyntax = /(^|[;}\s])(import|export)\b/;
async function classicScripts(html, file) {
    let output = html;
    for (const [tag, src] of html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)) {
        const code = await fs.readFile(path.resolve(path.dirname(file), src), "utf8");
        if (!moduleSyntax.test(code)) output = output.replace(tag, `<script defer src="${src}"></script>`);
    }
    return output;
}

// Rewrites root-relative links ("/assets/...") in the built output to relative
// ones ("./assets/...") so dist/ also works when opened straight from disk.
function relativeLinks() {
    return {
        name: "relative-links",
        hooks: {
            "astro:build:done": async ({ dir }) => {
                const root = fileURLToPath(dir);
                for (const entry of await fs.readdir(root, { recursive: true })) {
                    const file = path.join(root, entry);
                    const ext = path.extname(file);
                    if (ext !== ".html" && ext !== ".css") continue;

                    let prefix = path.relative(path.dirname(file), root).replaceAll(path.sep, "/");
                    prefix = prefix ? `${prefix}/` : "./";

                    const source = await fs.readFile(file, "utf8");
                    const output = ext === ".html"
                        ? await classicScripts(source.replace(/(\s(?:href|src)=["'])\/(?!\/)/g, `$1${prefix}`), file)
                        : source.replace(/(url\(\s*["']?)\/(?!\/)/g, `$1${prefix}`);
                    if (output !== source) await fs.writeFile(file, output);
                }
            },
        },
    };
}

export default defineConfig({
    site: "https://axaril.github.io",
    integrations: [relativeLinks()],
    // Emit scripts as separate files instead of inlining small bundles into the HTML.
    vite: { build: { assetsInlineLimit: 0 } },
});
