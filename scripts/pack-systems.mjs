// Builds the release zips in out/:
//
//   nuikit.zip               everything, shaped to drop into a server:
//     [nuikit]/              every system (put it in resources/, `ensure [nuikit]`)
//     overrides/<resource>/  UI replacements that merge into resources you already run
//                            (e.g. overrides/ox_lib/web/build → resources/[ox]/ox_lib/web/build)
//   nuikit-<addon>.zip       one override on its own, shaped like the resource it replaces
//
// Only what the game needs ships: manifests, Lua, config, theme, READMEs and built web output.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const stage = path.join(out, "nuikit");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, "[nuikit]"), { recursive: true });
const version = JSON.parse(fs.readFileSync(path.join(root, "packages/core/package.json"), "utf8")).version;

// ── systems → [nuikit]/
const systems = fs.readdirSync(path.join(root, "systems")).filter((d) => fs.existsSync(path.join(root, "systems", d, "fxmanifest.lua")));
for (const name of systems) {
  const from = path.join(root, "systems", name);
  const to = path.join(stage, "[nuikit]", name);
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(from, src);
      if (rel === "nuikit.json") return false;
      if (rel === "" || !rel.startsWith("web")) return true;
      return rel === "web" || rel === path.join("web", "dist") || rel.startsWith(path.join("web", "dist") + path.sep);
    },
  });
  if (fs.existsSync(path.join(from, "web")) && !fs.existsSync(path.join(to, "web", "dist", "index.html"))) {
    throw new Error(`${name}: web/dist is missing; build it first (pnpm build:systems)`);
  }
  console.log(`✓ [nuikit]/${name}`);
}

// ── addons → overrides/<resource>/<path>/ and their own zips
const overrides = [];
for (const name of fs.existsSync(path.join(root, "addons")) ? fs.readdirSync(path.join(root, "addons")).sort() : []) {
  const dir = path.join(root, "addons", name);
  const manifestPath = path.join(dir, "nuikit.json");
  if (!fs.existsSync(manifestPath)) continue;
  const { target } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const build = path.join(dir, "web", "build");
  // The entry keeps the replaced resource's ui_page name (index.html, or e.g. ui.html for qbx_scoreboard).
  const built = fs.existsSync(build) && fs.readdirSync(build).some((f) => f.endsWith(".html"));
  if (!built) throw new Error(`addons/${name}: web/build is missing; build it first`);
  const rel = path.join(target.resource, target.path);
  for (const base of [path.join(stage, "overrides"), path.join(out, "addons", name)]) {
    fs.cpSync(build, path.join(base, rel), { recursive: true });
  }
  fs.copyFileSync(path.join(dir, "README.md"), path.join(out, "addons", name, target.resource, "NUIKIT.md"));
  execFileSync("zip", ["-qr", path.join(out, `nuikit-${name}.zip`), target.resource], { cwd: path.join(out, "addons", name) });
  overrides.push({ name, resource: target.resource, rel: rel.split(path.sep).join("/") });
  console.log(`✓ overrides/${rel}`);
}

const list = (items) => items.map((s) => `- ${s}`).join("\n");
fs.writeFileSync(
  path.join(stage, "README.md"),
  `# nuikit ${version}

One design system for your whole FiveM server: https://github.com/belibathan/nuikit

## 1. Systems: \`[nuikit]/\`

Put the \`[nuikit]\` folder in \`resources/\` and add to server.cfg, after ox_lib and your framework:

\`\`\`cfg
ensure nuikit
ensure [nuikit]
\`\`\`

${list(systems.map((s) => `\`${s}\``))}

Each system's README says what it replaces (stop that resource). Delete any system you don't want.

## 2. Overrides: \`overrides/\`

New interfaces for resources you already run. Their Lua is untouched. Copy each folder over the
real resource (back up the original first), then restart it:

${list(overrides.map((o) => `\`overrides/${o.rel}\` → \`${o.resource}/${o.rel.slice(o.resource.length + 1)}\``))}

Updating that resource restores its stock UI; copy the override again afterwards.

## 3. Theme

Paste any TweakCN theme into \`[nuikit]/nuikit/theme.css\`. Every system and override uses it.
`,
);
execFileSync("zip", ["-qr", path.join(out, "nuikit.zip"), "."], { cwd: stage });
console.log(`→ out/nuikit.zip`);
for (const o of overrides) console.log(`→ out/nuikit-${o.name}.zip`);
