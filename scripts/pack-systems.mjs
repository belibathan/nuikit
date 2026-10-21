// Builds the release zips in out/:
//
//   nuikit.zip               everything, shaped to drop into a server:
//     [nuikit]/              every system (put it in resources/, `ensure [nuikit]`)
//     overrides/<resource>/  UI replacements that merge into resources you already run
//                            (e.g. overrides/ox_lib/web/build → resources/[ox]/ox_lib/web/build)
//   nuikit-<addon>.zip       one override on its own, shaped like the resource it replaces
//   nuikit-<framework>.zip   qbox | qbcore | esx | standalone: nuikit.zip plus that framework's server.cfg
//                            snippet (and, once they ship, only the adapter pack that fits it)
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

// overrides.json: what the pack shipped for each overridden resource and the page's hash, so `nuikit doctor`
// (docs/doctor.md) can tell an override that a library update wiped from one that is in place. Same FNV-1a as
// nuikit-core's pageHash (kept inline so packing never depends on the core build).
const pageHash = (text) => {
  const s = text.replace(/\r\n/g, "\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};
const overridesJson = { version, overrides: {} };
for (const o of overrides) {
  const build = path.join(root, "addons", o.name, "web", "build");
  const page = fs.readdirSync(build).find((f) => f.endsWith(".html"));
  const target = JSON.parse(fs.readFileSync(path.join(root, "addons", o.name, "nuikit.json"), "utf8")).target;
  overridesJson.overrides[o.resource] = {
    path: [target.path, page].join("/").replace(/\\/g, "/"),
    hash: pageHash(fs.readFileSync(path.join(build, page), "utf8")),
  };
}
fs.writeFileSync(path.join(stage, "[nuikit]", "nuikit", "overrides.json"), JSON.stringify(overridesJson, null, 2) + "\n");

const list = (items) => items.map((s) => `- ${s}`).join("\n");
fs.writeFileSync(
  path.join(stage, "README.md"),
  `# nuikit ${version}

One design system for your whole FiveM server: https://github.com/belibathan/nuikit

## 1. Systems: \`[nuikit]/\`

Put the \`[nuikit]\` folder in \`resources/\` and add ONE line to server.cfg, after ox_lib and your framework:

\`\`\`cfg
exec @nuikit/nuikit.cfg
\`\`\`

That file (\`[nuikit]/nuikit/nuikit.cfg\`) starts \`nuikit\` and \`[nuikit]\` in order and holds the settings
(currency, locale, the host); edit it there. \`nuikit-<framework>.zip\` adds a \`server.cfg.snippet\` with the
\`stop\` lines for that framework, and \`install/recipe-qbox.yaml\` is a txAdmin recipe for a new Qbox server.

${list(systems.map((s) => `\`${s}\``))}

Each system's README says what it replaces. Qbox starts most resources through categories
(\`ensure [qbx]\`, \`ensure [standalone]\`), so stop the replaced ones by name after those lines:

\`\`\`cfg
stop qbx_hud          # nuikit_hud (+ nuikit_stress keeps stress)
stop loadscreen       # nuikit_loading
stop qbx_chat_theme   # nuikit_chat
\`\`\`

Delete any system you don't want.

**Upgrading from 0.3.0:** delete your old \`nuikit\`, \`nuikit_hud\` and \`nuikit_stress\` folders first (wherever
they are in \`resources/\`), keeping a copy of \`nuikit/theme.css\`. Two resources with the same name won't start.

## 2. Overrides: \`overrides/\`

New interfaces for resources you already run. Their Lua is untouched. For each one: copy the real
folder somewhere as a backup, then copy ours **over** it so the files merge (don't delete the original
folder: some resources keep images next to their UI), then restart it:

${list(overrides.map((o) => `\`overrides/${o.rel}\` → \`${o.resource}/${o.rel.slice(o.resource.length + 1)}\``))}

Updating that resource restores its stock UI; copy the override again afterwards.

## 3. Theme

Paste any TweakCN theme into \`[nuikit]/nuikit/theme.css\`. Every system and override uses it.
`,
);
// install/: the txAdmin recipe travels with the zip; nuikit.cfg already sits in [nuikit]/nuikit.
fs.cpSync(path.join(root, "install"), path.join(stage, "install"), { recursive: true });
execFileSync("zip", ["-qr", path.join(out, "nuikit.zip"), "."], { cwd: stage });
console.log(`→ out/nuikit.zip`);

// ── per-framework zips: the same stage plus a server.cfg snippet for that framework (and, when adapter
// packs exist under adapters/[nuikit-<x>], only the one that fits: docs/architecture.md §3).
const frameworks = {
  qbox: { start: "ensure ox_lib\nensure [qbx]\nensure pma-voice", stop: ["qbx_hud", "loadscreen", "qbx_chat_theme"], adapter: "ox" },
  qbcore: { start: "ensure ox_lib\nensure qb-core\nensure pma-voice", stop: ["qb-hud", "qb-loading"], adapter: "qb" },
  esx: { start: "ensure ox_lib\nensure es_extended\nensure pma-voice", stop: ["esx_hud", "esx_loadingscreen"], adapter: "esx" },
  standalone: { start: "ensure ox_lib", stop: [], adapter: null },
};
for (const [fw, f] of Object.entries(frameworks)) {
  const dir = path.join(out, "fw", fw);
  fs.cpSync(stage, dir, { recursive: true });
  const pack = f.adapter && path.join(root, "adapters", `[nuikit-${f.adapter}]`);
  const hasPack = pack && fs.existsSync(pack);
  if (hasPack) fs.cpSync(pack, path.join(dir, `[nuikit-${f.adapter}]`), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "server.cfg.snippet"),
    `# nuikit ${version} on ${fw}: paste after your framework's lines in server.cfg
${f.start}
exec @nuikit/nuikit.cfg
${f.stop.map((r) => `stop ${r}`).join("\n")}
${hasPack ? `ensure [nuikit-${f.adapter}]` : f.adapter ? `# [nuikit-${f.adapter}] adapter pack: not shipped yet; the overrides/ folder covers ox_lib and friends` : ""}
`.replace(/\n{3,}/g, "\n\n"),
  );
  execFileSync("zip", ["-qr", path.join(out, `nuikit-${fw}.zip`), "."], { cwd: dir });
  console.log(`→ out/nuikit-${fw}.zip${hasPack ? " (+ adapter pack)" : ""}`);
}
fs.rmSync(path.join(out, "fw"), { recursive: true, force: true });
for (const o of overrides) console.log(`→ out/nuikit-${o.name}.zip`);
