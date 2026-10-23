/*
 * nuikit install / upgrade / uninstall (docs/install.md): the overrides, installed from the server console.
 *
 *   nuikit install [resource…] [--dry-run] [--force]   copy nuikit/overrides/<resource>/ over each installed
 *                                                     resource (merge), backing up the stock files first
 *   nuikit upgrade [resource…] [--dry-run] [--force]   the same word for the same thing after a new zip
 *   nuikit uninstall [resource…]                      put the stock files back from the backup
 *
 * The plan (which file is stock, ours, edited by the owner, gone from the zip) is nuikit-core's
 * planInstall / planUninstall (compiler.js carries it); this file only hashes the disk, applies the plan
 * with Node's fs and prints. Per resource it writes:
 *   <resource>/.nuikit-backup/manifest.json         what nuikit put there (version, file hashes)
 *   <resource>/.nuikit-backup/<version>/<rel>       the stock files replaced on the first install
 *   <resource>/.nuikit-backup/<version>.edited/…    owner edits that --force overwrote
 * Resources are found with GetResourcePath (installed, running or not); after writing, `refresh` and
 * `restart <resource>` so FXServer serves the new files.
 */
"use strict";

(() => {
const RESOURCE = GetCurrentResourceName();
const { planInstall, planUninstall, formatInstall, bytesHash } = globalThis.NuikitTheme;
// FXServer's server-side JS runtime is Node: fs and path are there. Guarded so a runtime without them says so.
const fs = typeof require === "function" ? require("fs") : null;
const sep = "/";
const BACKUP_DIR = ".nuikit-backup";

const join = (...parts) => parts.filter(Boolean).join(sep).replace(/\\/g, "/").replace(/\/+/g, "/");
const dirname = (p) => p.slice(0, Math.max(p.lastIndexOf("/"), 0));
const safeRel = (rel) => typeof rel === "string" && rel.length > 0 && !rel.startsWith("/") && !/^[a-zA-Z]:/.test(rel) && !rel.split("/").includes("..");

function resourcePath(name) {
  if (!/^[\w.-]+$/.test(name) || typeof GetResourcePath !== "function") return null;
  const p = GetResourcePath(name);
  return p ? String(p).replace(/\\/g, "/").replace(/\/$/, "") : null;
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}
function hashFile(p) {
  try { return exists(p) ? bytesHash(fs.readFileSync(p)) : null; } catch { return null; }
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function copy(from, to) {
  ensureDir(dirname(to));
  fs.copyFileSync(from, to);
}
function remove(p) {
  try { fs.unlinkSync(p); } catch { /* already gone */ }
}

function shippedManifest() {
  const raw = LoadResourceFile(RESOURCE, "overrides.json");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readInstalled(res) {
  const base = resourcePath(res);
  if (!base || !fs) return null;
  const p = join(base, BACKUP_DIR, "manifest.json");
  if (!exists(p)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(p, "utf8"));
    return m && typeof m.version === "string" && m.files && typeof m.files === "object" ? m : null;
  } catch { return null; }
}

/** bytesHash of <resource>/<rel> on disk, null when absent (the doctor's edited check). */
function fileHash(res, rel) {
  const base = resourcePath(res);
  if (!base || !fs || !safeRel(rel)) return null;
  return hashFile(join(base, rel));
}

function parseArgs(args) {
  const names = [];
  const flags = { dryRun: false, force: false };
  for (const a of args) {
    if (a === "--dry-run" || a === "-n") flags.dryRun = true;
    else if (a === "--force" || a === "-f") flags.force = true;
    else if (a.startsWith("--")) flags.unknown = a;
    else names.push(a);
  }
  return { names, flags };
}

function install(reply, args) {
  const { names, flags } = parseArgs(args);
  if (flags.unknown) return reply(`unknown flag ${flags.unknown}; usage: nuikit install [resource…] [--dry-run] [--force]`);
  if (!fs) return reply("^1this server's JS runtime has no fs module; copy nuikit/overrides/<resource>/ by hand (docs/install.md)^7");
  const shipped = shippedManifest();
  if (!shipped) return reply("^3no overrides.json in the nuikit resource: this zip has no overrides, or it is older than 0.9^7");
  const version = String(shipped.version || "0.0.0");
  const wanted = names.length ? names : Object.keys(shipped.overrides);
  const nuikitBase = resourcePath(RESOURCE);
  const outcomes = [];
  for (const res of wanted) {
    const o = shipped.overrides[res];
    if (!o) { reply(`^3${res}: nuikit ships no override for it (${Object.keys(shipped.overrides).join(", ")})^7`); continue; }
    const base = resourcePath(res);
    if (!base) { outcomes.push({ resource: res, state: "missing" }); continue; }
    if (!o.files || !Object.keys(o.files).length) { outcomes.push({ resource: res, state: "no-files" }); continue; }
    const installed = readInstalled(res);
    const rels = new Set([...Object.keys(o.files), ...Object.keys(installed ? installed.files : {})]);
    const disk = {};
    for (const rel of rels) disk[rel] = safeRel(rel) ? hashFile(join(base, rel)) : null;
    const backupOf = (rel) => join(base, BACKUP_DIR, installed ? installed.backup || installed.version : version, rel);
    const plan = planInstall({ version, shipped: o.files, installed, disk, force: flags.force, hasBackup: (rel) => exists(backupOf(rel)) });
    if (!flags.dryRun && plan.changes > 0) {
      for (const a of plan.actions) {
        if (!safeRel(a.rel)) continue;
        const dst = join(base, a.rel);
        const src = join(nuikitBase, "overrides", res, a.rel);
        if (a.op === "keep" || a.op === "skip-edited") continue;
        if (a.op === "replace") { if (!exists(backupOf(a.rel))) copy(dst, backupOf(a.rel)); copy(src, dst); continue; }
        if (a.op === "force-edited") { copy(dst, join(base, BACKUP_DIR, `${installed ? installed.version : version}.edited`, a.rel)); copy(src, dst); continue; }
        if (a.op === "add" || a.op === "update") { copy(src, dst); continue; }
        if (a.op === "restore") { copy(backupOf(a.rel), dst); remove(backupOf(a.rel)); continue; }
        if (a.op === "remove") { remove(dst); continue; }
      }
    }
    if (!flags.dryRun) {
      ensureDir(join(base, BACKUP_DIR));
      fs.writeFileSync(join(base, BACKUP_DIR, "manifest.json"), JSON.stringify(plan.manifest, null, 2) + "\n");
    }
    outcomes.push({ resource: res, state: "planned", plan });
  }
  for (const line of formatInstall(outcomes, { dryRun: flags.dryRun, version })) reply(line);
}

function uninstall(reply, args) {
  const { names, flags } = parseArgs(args);
  if (!fs) return reply("^1this server's JS runtime has no fs module; restore <resource>/.nuikit-backup/ by hand^7");
  const shipped = shippedManifest();
  const wanted = names.length ? names : Object.keys((shipped && shipped.overrides) || {});
  const outcomes = [];
  for (const res of wanted) {
    const base = resourcePath(res);
    if (!base) { outcomes.push({ resource: res, state: "missing" }); continue; }
    const installed = readInstalled(res);
    if (!installed) { outcomes.push({ resource: res, state: "not-installed" }); continue; }
    const backupOf = (rel) => join(base, BACKUP_DIR, installed.backup || installed.version, rel);
    const disk = {};
    for (const rel of Object.keys(installed.files)) disk[rel] = safeRel(rel) ? hashFile(join(base, rel)) : null;
    const plan = planUninstall({ installed, disk, hasBackup: (rel) => exists(backupOf(rel)) });
    if (!flags.dryRun) {
      for (const a of plan.actions) {
        if (!safeRel(a.rel)) continue;
        if (a.op === "restore") { copy(backupOf(a.rel), join(base, a.rel)); remove(backupOf(a.rel)); }
        else if (a.op === "remove") remove(join(base, a.rel));
      }
      remove(join(base, BACKUP_DIR, "manifest.json"));
    }
    outcomes.push({ resource: res, state: "planned", plan });
  }
  for (const line of formatInstall(outcomes, { dryRun: flags.dryRun, uninstall: true, version: shipped ? shipped.version : "" })) reply(line);
}

/** Every installed manifest, for the doctor's snapshot. */
function installedAll(shipped) {
  const out = {};
  for (const res of Object.keys((shipped && shipped.overrides) || {})) out[res] = readInstalled(res);
  return out;
}

globalThis.NuikitInstall = { install, uninstall, readInstalled, installedAll, fileHash };
})();
