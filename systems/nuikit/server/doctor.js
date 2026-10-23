/*
 * nuikit doctor: the server tells you what's left (docs/doctor.md).
 *
 *   nuikit doctor         framework, adapter packs, every UI resource's status, conflicts, next steps
 *   nuikit doctor json    the same report as one JSON line (txAdmin, scripts)
 *
 * This file only builds the snapshot from FXServer natives and prints; the detection and every
 * finding live in nuikit-core's doctor (compiler.js carries it, synced from packages/core), so they
 * run under vitest with hand-made snapshots.
 *
 * Live intent counts: the intents runtime emits `nuikit:intent` { source, intent } (server event, or
 * from a client); counted here by source resource since start. Convars:
 *   nuikit_latest <version>   tell the doctor the newest release (no network calls are made)
 *   nuikit_check_updates 1    opt in to an online check (reserved; prints that it's not built yet)
 */
"use strict";

// One scope: FXServer runs every server_script of a resource in the same context (main.js has its own RESOURCE).
(() => {
const RESOURCE = GetCurrentResourceName();
const { doctor, formatDoctor, pageHash } = globalThis.NuikitTheme;

// Metadata keys the doctor reads. GetResourceMetadata only answers for keys asked by name.
// chat_theme is what the cfx chat resource looks for (nuikit_chat has no page of its own).
const KEYS = [
  "ui_page", "loadscreen", "chat_theme", "version", "provide", "dependency", "dependencies",
  "nuikit_protocol", "nuikit_ui", "nuikit_renderer", "nuikit_level", "nuikit_adapter",
  "shared_script", "client_script", "server_script", "shared_scripts", "client_scripts", "server_scripts",
];

// Resources already started when nuikit's server script ran started before nuikit.
const startedBefore = new Set();
for (let i = 0; i < GetNumResources(); i++) {
  const name = GetResourceByFindIndex(i);
  if (name && name !== RESOURCE && GetResourceState(name) === "started") startedBefore.add(name);
}
// Each started resource's fxmanifest.lua as it was when it started (a hash). An edit on disk after that
// (a new `files` entry, say) isn't seen until `refresh`: bit the owner once (0.7.0 handoff §6).
// LoadResourceFile reads the disk, so the doctor can compare. Null when the manifest can't be read.
const manifestAtStart = new Map();
function manifestHash(name) {
  const text = LoadResourceFile(name, "fxmanifest.lua") || LoadResourceFile(name, "__resource.lua");
  return text ? pageHash(text) : null;
}
for (let i = 0; i < GetNumResources(); i++) {
  const name = GetResourceByFindIndex(i);
  if (name && GetResourceState(name) === "started") manifestAtStart.set(name, manifestHash(name));
}
on("onResourceStart", (name) => {
  startedBefore.delete(name);
  manifestAtStart.set(name, manifestHash(name));
});

// Intent counts by source: nuikit:intent { source, intent } locally, or { batch = [{ source, intent, count }] }
// from a client's runtime (one batch every 10 s).
// Client-sent (onNet), so: strings only, capped lengths, capped distinct keys, capped counts, and maps
// without a prototype (a source named "__proto__" must not write into Object.prototype).
const intents = Object.create(null);
function countOne(entry, n) {
  if (!entry || typeof entry !== "object") return;
  if (typeof entry.source !== "string" || typeof entry.intent !== "string") return;
  const source = entry.source.slice(0, 64) || "unknown";
  const intent = entry.intent.slice(0, 32) || "unknown";
  if (!intents[source] && Object.keys(intents).length >= 256) return;
  const bySource = (intents[source] = intents[source] || Object.create(null));
  if (!(intent in bySource) && Object.keys(bySource).length >= 64) return;
  bySource[intent] = (bySource[intent] || 0) + n;
}
function countIntent(payload) {
  if (!payload || typeof payload !== "object") return;
  if (!Array.isArray(payload.batch)) return countOne(payload, 1);
  for (const entry of payload.batch.slice(0, 64)) {
    const n = entry && Number.isInteger(entry.count) ? Math.min(Math.max(entry.count, 1), 10000) : 1;
    countOne(entry, n);
  }
}
// A client's runtime sends at most one batch per 10 s; anything faster is dropped.
const lastBatch = new Map();
const BATCH_MS = 5000;
on("nuikit:intent", countIntent);
onNet("nuikit:intent", (payload) => {
  const src = String(global.source);
  const now = Date.now();
  if (now - (lastBatch.get(src) || 0) < BATCH_MS) return;
  lastBatch.set(src, now);
  countIntent(payload);
});
on("playerDropped", () => lastBatch.delete(String(global.source)));

function metadata(name) {
  const out = {};
  for (const key of KEYS) {
    const n = GetNumResourceMetadata(name, key);
    if (!n) continue;
    out[key] = [];
    for (let i = 0; i < n; i++) out[key].push(String(GetResourceMetadata(name, key, i)));
  }
  return out;
}

function snapshot() {
  const resources = [];
  for (let i = 0; i < GetNumResources(); i++) {
    const name = GetResourceByFindIndex(i);
    if (!name) continue;
    const state = GetResourceState(name);
    const was = manifestAtStart.get(name);
    const manifestChanged = state === "started" && was != null && manifestHash(name) !== was;
    resources.push({ name, state, metadata: metadata(name), startedBeforeRuntime: startedBefore.has(name), manifestChanged });
  }
  let overrides = null;
  const raw = LoadResourceFile(RESOURCE, "overrides.json");
  if (raw) {
    try {
      overrides = JSON.parse(raw);
    } catch (err) {
      console.log(`^5[nuikit]^7 ^3overrides.json is not valid JSON: ${err && err.message ? err.message : err}^7`);
    }
  }
  const theme = typeof globalThis.__nuikitTheme === "function" ? globalThis.__nuikitTheme() : null;
  const latest = GetConvar("nuikit_latest", "") || null;
  return {
    runtime: { version: GetResourceMetadata(RESOURCE, "version", 0) || "0.0.0", protocol: Number(GetResourceMetadata(RESOURCE, "nuikit_protocol", 0) || 1), latest },
    resources,
    readFile: (res, path) => LoadResourceFile(res, path) || null,
    overrides,
    theme: theme ? { contrast: theme.contrast, warnings: theme.warnings } : null,
    intents,
  };
}

function run(reply, json) {
  const report = doctor(snapshot());
  if (json) {
    reply(JSON.stringify(report));
    return report;
  }
  for (const line of formatDoctor(report)) {
    reply(line.replace(/^(\s+)(ERROR)\b/, "$1^1$2^7").replace(/^(\s+)(WARN)\b/, "$1^3$2^7").replace(/^(\s+)(INFO)\b/, "$1^5$2^7"));
  }
  if (GetConvar("nuikit_check_updates", "0") === "1") {
    reply("^3nuikit_check_updates is set, but the online check isn't built yet; set `nuikit_latest <version>` by hand^7");
  }
  return report;
}

globalThis.NuikitDoctor = { run, snapshot };
exports("doctor", () => doctor(snapshot()));
})();
