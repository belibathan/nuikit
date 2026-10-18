// Builds out/nuikit-systems.zip: a `[nuikit]` folder servers drop into resources/.
// Only what the game needs ships: manifests, Lua, config, theme, READMEs and the built web/dist.
// (Each system's web/ source stays in the repo for people who want to edit it.)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const stage = path.join(out, "[nuikit]");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

const systems = fs.readdirSync(path.join(root, "systems")).filter((d) => fs.existsSync(path.join(root, "systems", d, "fxmanifest.lua")));
for (const name of systems) {
  const from = path.join(root, "systems", name);
  const to = path.join(stage, name);
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(from, src);
      if (rel === "" || !rel.startsWith("web")) return true;
      // from web/ keep only the build
      return rel === "web" || rel === path.join("web", "dist") || rel.startsWith(path.join("web", "dist") + path.sep);
    },
  });
  if (fs.existsSync(path.join(from, "web")) && !fs.existsSync(path.join(to, "web", "dist", "index.html"))) {
    throw new Error(`${name}: web/dist is missing; build it first (pnpm build:systems)`);
  }
  console.log(`✓ ${name}`);
}

fs.writeFileSync(
  path.join(stage, "README.md"),
  `# [nuikit]\n\nOne design system for your whole server: https://github.com/belibathan/nuikit\n\n1. Put this folder in \`resources/\`.\n2. In server.cfg:\n\n\`\`\`cfg\nensure nuikit\nensure [nuikit]\n\`\`\`\n\n3. Stop the resources these replace (for example \`qbx_hud\`).\n4. Theme everything from \`nuikit/theme.css\` (paste any TweakCN theme).\n`,
);
execFileSync("zip", ["-qr", "nuikit-systems.zip", "[nuikit]"], { cwd: out });
console.log(`→ ${path.relative(root, path.join(out, "nuikit-systems.zip"))}`);
