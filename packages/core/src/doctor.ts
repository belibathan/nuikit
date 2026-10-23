/**
 * `nuikit doctor` (docs/doctor.md): the server tells you what's left.
 *
 * Pure: `doctor(snapshot)` takes what the FXServer glue collected (resources, their fxmanifest metadata,
 * page files, the compiled theme, live intent counts) and returns a report; `formatDoctor` turns it into
 * console lines. Nothing here touches natives, so it runs under vitest with hand-made snapshots.
 *
 * Extension points (adapter packs register through fxmanifest metadata, no code):
 *   nuikit_adapter 'ox_lib'      this resource draws ox_lib's UI calls; ox_lib counts as "adapted"
 *   nuikit_level '3'             conformance level (docs/protocol.md §10) a nuikit UI declares
 *   provide 'ox_lib'             a stand-in; the doctor warns when the library runs too
 *   overrides.json               what the zip shipped as override pages, with hashes (docs/doctor.md §3)
 *   nuikit:intent {source,intent} server event the intents runtime emits; the doctor counts by source
 */

import { COVERAGE_TARGETS } from "./coverage";
import type { ContrastResult } from "./tokens";

// ─────────────────────────────────────────── input

export interface DoctorResource {
  name: string;
  /** GetResourceState: started, stopped, starting, stopping, missing, uninitialized, unknown. */
  state: string;
  /** fxmanifest metadata, every value (GetResourceMetadata(name, key, i) for i < GetNumResourceMetadata). */
  metadata: Record<string, string[]>;
  /** The resource was already started when nuikit's server script ran (nuikit started after it). */
  startedBeforeRuntime?: boolean;
  /** Its fxmanifest.lua on disk differs from the one read when it started (edited since; needs `refresh`). */
  manifestChanged?: boolean;
}

export interface DoctorSnapshot {
  runtime: {
    /** The nuikit resource's version (fxmanifest `version`). */
    version: string;
    /** The highest protocol version the runtime speaks. */
    protocol: number;
    /** Newest published release, when known (convar `nuikit_latest`, or a later update check). */
    latest?: string | null;
  };
  resources: DoctorResource[];
  /** LoadResourceFile; returns null when the file isn't there. Only called for pages. */
  readFile?: (resource: string, path: string) => string | null;
  /** The shipped override list (overrides.json in the nuikit resource). */
  overrides?: OverrideManifest | null;
  /** Per resource: its `.nuikit-backup/manifest.json` (what `nuikit install` wrote), when there is one. */
  installed?: Record<string, { version: string; files: Record<string, string> } | null> | null;
  /** `fileHash(resource, rel)`: bytesHash of a file on disk, null when absent (for the edited check). */
  fileHash?: (resource: string, rel: string) => string | null;
  /** The compiled theme's checks (server/main.js keeps them). */
  theme?: { contrast: ContrastResult[]; warnings: string[] } | null;
  /** Live intent counts: source resource → intent → count. */
  intents?: Record<string, Record<string, number>> | null;
  /** Adapter packs to evaluate; defaults to ADAPTER_PACKS. */
  packs?: AdapterPack[];
}

/** overrides.json: what this nuikit build ships as override pages. */
export interface OverrideManifest {
  /** nuikit version the hashes belong to. */
  version: string;
  overrides: Record<string, { path: string; hash: string; files?: Record<string, string> }>;
}

export interface AdapterPack {
  /** Folder name, e.g. `[nuikit-ox]`. */
  name: string;
  /** Resource that must run for the pack to make sense. */
  library: string;
  /** Frameworks it fits ("any" for all). */
  frameworks: (Framework | "any")[];
  /** Whether a release contains it yet. Say so honestly. */
  shipped: boolean;
}

export type Framework = "qbox" | "qbcore" | "esx" | "standalone";

// ─────────────────────────────────────────── output

export type ResourceStatus = "runtime" | "nuikit" | "hosted" | "adapted" | "override" | "untouched";

export interface ResourceReport {
  name: string;
  status: ResourceStatus;
  /** What makes it a UI: `ui_page` or `loadscreen` (null for a chat theme, which has no page of its own). */
  page: string | null;
  protocol?: number;
  level?: number;
  /**
   * For `adapted`: the adapter resource. For `override`: the override's status. For a `nuikit`
   * resource without the handshake: `loadscreen` (runs before the runtime) or `theme` (a chat theme).
   */
  via?: string;
  /** Plain-words next step, when there is one. */
  next?: string;
}

export type Severity = "error" | "warn" | "info";

export interface Finding {
  code:
    | "provide-conflict"
    | "override-drifted"
    | "override-missing"
    | "override-outdated"
    | "override-edited"
    | "protocol-newer"
    | "start-order"
    | "manifest-changed"
    | "missing-dependency"
    | "systems-stopped"
    | "theme-contrast"
    | "theme-warning"
    | "update-available"
    | "framework";
  severity: Severity;
  /** One line. */
  message: string;
  /** What to do, in plain words. */
  next: string;
  resource?: string;
}

export interface DoctorReport {
  framework: Framework;
  /** The resource that gave the framework away (qbx_core, qb-core, es_extended), or null. */
  frameworkResource: string | null;
  runtime: { version: string; protocol: number; latest: string | null };
  packs: { name: string; fits: boolean; shipped: boolean; running: boolean; library: string; libraryRunning: boolean }[];
  resources: ResourceReport[];
  findings: Finding[];
  intents: { source: string; total: number; byIntent: Record<string, number> }[];
  summary: { ui: number; nuikit: number; adapted: number; override: number; untouched: number; errors: number; warnings: number };
}

// ─────────────────────────────────────────── tables

/** The systems `[nuikit]` ships and nuikit.cfg ensures by name (nuikit_dev is opt-in, so not here). */
export const NUIKIT_SYSTEMS = ["nuikit_chat", "nuikit_death", "nuikit_hud", "nuikit_loading", "nuikit_pause", "nuikit_stress", "nuikit_voice"];

export const ADAPTER_PACKS: AdapterPack[] = [
  // ox_lib has no pack, ever: its override (overrides/ox_lib) already routes it to the intents.
  { name: "[nuikit-qb]", library: "qb-core", frameworks: ["qbcore", "qbox"], shipped: true },
  { name: "[nuikit-esx]", library: "es_extended", frameworks: ["esx"], shipped: true },
];

const FRAMEWORKS: { resource: string; framework: Framework }[] = [
  { resource: "qbx_core", framework: "qbox" },
  { resource: "qb-core", framework: "qbcore" },
  { resource: "es_extended", framework: "esx" },
];

/** The marker every override page carries (docs/protocol.md §5.6). */
export const OVERRIDE_MARKER = /<meta\s+name=["']nuikit-handshake["']\s+content=["']off["']/i;

// ─────────────────────────────────────────── helpers

function meta(r: DoctorResource, key: string): string[] {
  return r.metadata[key] ?? [];
}
function first(r: DoctorResource, key: string): string | undefined {
  return meta(r, key)[0];
}
const started = (r: DoctorResource) => r.state === "started" || r.state === "starting";
const isNuikit = (r: DoctorResource) => r.name === "nuikit";
/** One of nuikit's own `[nuikit]` resources (nuikit_hud, nuikit_loading, nuikit_chat…). */
const isNuikitFamily = (r: DoctorResource) => /^nuikit_/i.test(r.name);

/** FNV-1a, 32 bit, hex: the hash overrides.json carries (line endings normalised). */
export function pageHash(text: string): string {
  const s = text.replace(/\r\n/g, "\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Compare dotted versions; >0 when a is newer. Non-numeric parts compare as strings. */
/**
 * Semver-ish compare: `v` prefix and `+build` metadata ignored; missing core parts count as 0; a prerelease
 * (`0.7.0-next.1`) sorts before its release (`0.7.0`), and prerelease identifiers compare as semver does.
 * Returns <0, 0 or >0.
 */
export function compareVersions(a: string, b: string): number {
  const [ca, pa = ""] = splitVersion(a);
  const [cb, pb = ""] = splitVersion(b);
  const na = ca.split(".");
  const nb = cb.split(".");
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (Number(na[i] ?? 0) || 0) - (Number(nb[i] ?? 0) || 0);
    if (d !== 0) return d;
  }
  if (pa === pb) return 0;
  if (!pa) return 1; // release beats prerelease
  if (!pb) return -1;
  const ia = pa.split(".");
  const ib = pb.split(".");
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    if (ia[i] === undefined) return -1; // shorter prerelease sorts first
    if (ib[i] === undefined) return 1;
    const x = ia[i]!;
    const y = ib[i]!;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      if (Number(x) !== Number(y)) return Number(x) - Number(y);
    } else if (xn !== yn) return xn ? -1 : 1; // numeric identifiers sort before alphanumeric
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function splitVersion(v: string): [string, string] {
  const s = v.trim().replace(/^v/i, "").split("+")[0]!;
  const dash = s.indexOf("-");
  return dash < 0 ? [s, ""] : [s.slice(0, dash), s.slice(dash + 1)];
}

export function detectFramework(resources: DoctorResource[]): { framework: Framework; resource: string | null } {
  for (const f of FRAMEWORKS) {
    const r = resources.find((x) => x.name === f.resource && started(x));
    if (r) return { framework: f.framework, resource: r.name };
  }
  return { framework: "standalone", resource: null };
}

// ─────────────────────────────────────────── the doctor

export function doctor(snap: DoctorSnapshot): DoctorReport {
  const resources = snap.resources;
  const running = resources.filter(started);
  const byName = new Map(resources.map((r) => [r.name, r]));
  const findings: Finding[] = [];
  const { framework, resource: frameworkResource } = detectFramework(resources);

  // Adapter packs: which fit this server.
  const packs = (snap.packs ?? ADAPTER_PACKS).map((p) => {
    const lib = byName.get(p.library);
    const libraryRunning = !!lib && started(lib);
    const fits = libraryRunning && (p.frameworks.includes("any") || p.frameworks.includes(framework));
    const packRunning = running.some((r) => meta(r, "nuikit_adapter").includes(p.library));
    return { name: p.name, fits, shipped: p.shipped, running: packRunning, library: p.library, libraryRunning };
  });

  // Adapters present: library → adapter resource.
  const adaptedBy = new Map<string, string>();
  for (const r of running) for (const lib of meta(r, "nuikit_adapter")) adaptedBy.set(lib, r.name);

  // Every running resource with a page (or a chat theme: no page, but it is the chat's UI).
  const reports: ResourceReport[] = [];
  const chatThemes = running.filter((r) => meta(r, "chat_theme").length > 0);
  for (const r of running) {
    const page = first(r, "ui_page") ?? first(r, "loadscreen") ?? null;
    const hosted = first(r, "nuikit_ui");
    const loadscreen = first(r, "ui_page") === undefined && first(r, "loadscreen") !== undefined;
    const chatTheme = meta(r, "chat_theme").length > 0;
    if (!page && !hosted && !chatTheme && !isNuikit(r)) continue;
    const rep: ResourceReport = { name: r.name, status: "untouched", page };
    const proto = first(r, "nuikit_protocol");
    const level = first(r, "nuikit_level");
    if (isNuikit(r)) rep.status = "runtime";
    else if (proto !== undefined) {
      rep.status = "nuikit";
      rep.protocol = Number(proto);
      if (level !== undefined) rep.level = Number(level);
    } else if (hosted) rep.status = "hosted";
    else if (isNuikitFamily(r) && loadscreen) {
      // nuikit_loading runs before the runtime, so it can't speak the handshake: themed by the handover
      rep.status = "nuikit";
      rep.via = "loadscreen";
    } else if (isNuikitFamily(r) && chatTheme) {
      // nuikit_chat is a chat_theme for the cfx chat resource: no page of its own
      rep.status = "nuikit";
      rep.via = "theme";
    } else if (chatTheme && !page) {
      // another chat theme (qbx_chat_theme…): the chat resource takes the last one it loads
      const ours = chatThemes.find((t) => t !== r && isNuikitFamily(t));
      rep.next = ours ? `a chat theme next to ${ours.name}: chat takes one of them, so \`stop ${r.name}\`` : "a chat theme; nuikit_chat replaces it";
    } else if (adaptedBy.has(r.name)) {
      rep.status = "adapted";
      rep.via = adaptedBy.get(r.name);
    } else if (page && snap.readFile) {
      const html = snap.readFile(r.name, page);
      if (html && OVERRIDE_MARKER.test(html)) {
        rep.status = "override";
        rep.via = "nuikit";
      }
    }
    if (rep.status === "untouched" && loadscreen) {
      rep.next = running.some((t) => t !== r && isNuikitFamily(t) && first(t, "loadscreen") !== undefined)
        ? `a loading screen next to nuikit_loading: the game shows one of them, so \`stop ${r.name}\``
        : "a loading screen; nuikit_loading replaces it";
    } else if (rep.status === "untouched" && !rep.next) {
      const pack = packs.find((p) => p.fits && p.library === r.name);
      rep.next = pack
        ? pack.shipped
          ? `install ${pack.name} to draw ${r.name}'s UI with nuikit`
          : `${pack.name} will adapt it (not shipped yet)`
        : `its UI is its own; add nuikit_protocol to join (docs/protocol.md) or wait for an override`;
    }
    if (rep.status === "nuikit" && rep.protocol !== undefined && rep.level === undefined) rep.next = "declare nuikit_level '<1-3>' from `nuikit check` so the doctor can show it";
    reports.push(rep);
  }

  // Conflicts: provide + the real thing.
  for (const r of running) {
    for (const provided of meta(r, "provide")) {
      const real = byName.get(provided);
      if (real && real !== r && started(real)) {
        findings.push({
          code: "provide-conflict",
          severity: "error",
          resource: r.name,
          message: `${r.name} provides ${provided}, and ${provided} itself is running`,
          next: `stop one of them: \`ensure ${r.name}\` replaces ${provided}, so remove \`ensure ${provided}\` (or the other way round)`,
        });
      }
    }
  }

  // Override pages vs what we shipped.
  if (snap.overrides && snap.readFile) {
    const shippedVersion = snap.overrides.version;
    for (const [res, o] of Object.entries(snap.overrides.overrides)) {
      const r = byName.get(res);
      if (!r || !started(r)) continue;
      const html = snap.readFile(res, o.path);
      const rep = reports.find((x) => x.name === res);
      const installed = snap.installed?.[res] ?? null;
      if (!html || !OVERRIDE_MARKER.test(html)) {
        findings.push({
          code: "override-missing",
          severity: "warn",
          resource: res,
          message: `${res}: the nuikit override page isn't at ${o.path} (a library update replaced it, or it was never installed)`,
          next: `\`nuikit install ${res}\` in the server console, then \`restart ${res}\``,
        });
        if (rep) {
          rep.via = "override missing";
          rep.next = `\`nuikit install ${res}\``;
        }
        continue;
      }
      if (installed && compareVersions(shippedVersion, installed.version) > 0) {
        findings.push({
          code: "override-outdated",
          severity: "warn",
          resource: res,
          message: `${res}: the override is from nuikit ${installed.version}; this zip ships ${shippedVersion}`,
          next: `\`nuikit upgrade ${res}\` (or \`nuikit upgrade\` for all), then \`restart ${res}\``,
        });
        if (rep) rep.via = `override ${installed.version}, outdated`;
        continue;
      }
      // Any file `nuikit install` wrote that differs from what it wrote: the owner's edit (kept on upgrade).
      const editedByOwner =
        !!installed && !!snap.fileHash && Object.entries(installed.files).some(([rel, h]) => { const d = snap.fileHash!(res, rel); return d !== null && d !== h; });
      if (editedByOwner) {
        findings.push({
          code: "override-edited",
          severity: "info",
          resource: res,
          message: `${res}: the override was edited since nuikit ${installed!.version} installed it`,
          next: `keep it, or \`nuikit install ${res} --force\` to put the shipped files back (your edits are saved under ${res}/.nuikit-backup/)`,
        });
        if (rep) rep.via = "override edited";
      } else if (pageHash(html) !== o.hash) {
        findings.push({
          code: "override-drifted",
          severity: "warn",
          resource: res,
          message: `${res}: the override page at ${o.path} isn't the one nuikit ${shippedVersion} shipped (edited, or from another release)`,
          next: `if you didn't edit it, \`nuikit install ${res}\` and \`restart ${res}\``,
        });
        if (rep) rep.via = "override changed";
      }
    }
  }

  // Protocol newer than the runtime.
  for (const rep of reports) {
    if (rep.protocol !== undefined && rep.protocol > snap.runtime.protocol) {
      findings.push({
        code: "protocol-newer",
        severity: "error",
        resource: rep.name,
        message: `${rep.name} speaks protocol ${rep.protocol}; this nuikit speaks ${snap.runtime.protocol}`,
        next: `update nuikit (the runtime supports the previous protocol, not a newer one)`,
      });
    }
  }

  // Start order and missing dependency.
  for (const r of running) {
    if (isNuikit(r)) continue;
    const scripts = ["shared_script", "client_script", "server_script", "shared_scripts", "client_scripts", "server_scripts"].flatMap((k) => meta(r, k));
    const imports = scripts.some((s) => s.startsWith("@nuikit/"));
    const depends = meta(r, "dependency").includes("nuikit") || meta(r, "dependencies").includes("nuikit");
    if (imports && !depends) {
      findings.push({
        code: "missing-dependency",
        severity: "warn",
        resource: r.name,
        message: `${r.name} imports @nuikit/init.lua but doesn't declare \`dependency 'nuikit'\``,
        next: `add \`dependency 'nuikit'\` to its fxmanifest.lua so FiveM starts nuikit first`,
      });
    }
    if (r.manifestChanged) {
      findings.push({
        code: "manifest-changed",
        severity: "warn",
        resource: r.name,
        message: `${r.name}: fxmanifest.lua changed on disk after it started (a new \`files\` entry isn't served until the server re-reads it)`,
        next: `\`refresh\`, then \`restart ${r.name}\``,
      });
    }
    if ((imports || depends) && r.startedBeforeRuntime) {
      findings.push({
        code: "start-order",
        severity: "error",
        resource: r.name,
        message: `${r.name} started before nuikit; its @nuikit import failed on that start`,
        next: `put \`ensure nuikit\` before \`ensure ${r.name}\` in server.cfg, then \`restart ${r.name}\``,
      });
    }
  }

  // [nuikit] systems installed but not running: `ensure [nuikit]` starts nothing when the folders are
  // junctions or symlinks (FiveM doesn't resolve the category), and a server.cfg may miss the exec.
  const idle = resources
    .filter((r) => NUIKIT_SYSTEMS.includes(r.name) && r.state !== "started" && r.state !== "starting" && r.state !== "missing")
    .map((r) => r.name);
  if (idle.length) {
    const ensures = idle.map((n) => "`ensure " + n + "`").join(", ");
    findings.push({
      code: "systems-stopped",
      severity: "warn",
      message: `${idle.length} [nuikit] system${idle.length > 1 ? "s are" : " is"} installed but not running: ${idle.join(", ")}`,
      next: "`exec @nuikit/nuikit.cfg` in server.cfg (it ensures each system by name), or " + ensures + "; delete a system's folder if you don't want it",
    });
  } else if (!resources.some((r) => NUIKIT_SYSTEMS.includes(r.name))) {
    // none known to the server at all: not copied, or behind a folder FiveM didn't scan
    findings.push({
      code: "systems-stopped",
      severity: "info",
      message: "no [nuikit] system found (nuikit_hud, nuikit_pause…): only the runtime and overrides are in use",
      next: "copy the `[nuikit]` folder from the zip into resources/ (real folders, not junctions or symlinks), `refresh`, then `exec @nuikit/nuikit.cfg`",
    });
  }

  // Theme. The compiler reports a failed pair twice (a ContrastResult and a plain warning "<fg> on
  // <bg> is 3.5:1 (needs 4.5:1); …"), and the doctor printed both (0.7.0 baseline): one per pair.
  if (snap.theme) {
    const pairs = new Set<string>();
    for (const c of snap.theme.contrast) {
      if (c.ok) continue;
      pairs.add(`${c.fg} on ${c.bg}`);
      findings.push({
        code: "theme-contrast",
        severity: "warn",
        message: `theme: ${c.fg} on ${c.bg} is ${c.ratio.toFixed(2)}:1 (min ${c.min}:1)`,
        next: `lighten or darken \`--${c.fg}\` or \`--${c.bg}\` in nuikit/theme.css, then \`nuikit theme reload\``,
      });
    }
    for (const w of snap.theme.warnings) {
      const pair = /^([\w-]+) on ([\w-]+) is [\d.]+:1/.exec(w);
      if (pair && pairs.has(`${pair[1]} on ${pair[2]}`)) continue; // already covered per pair
      if (/contrast/i.test(w)) continue;
      findings.push({ code: "theme-warning", severity: "info", message: `theme: ${w}`, next: `fix it in nuikit/theme.css, then \`nuikit theme reload\`` });
    }
  }

  // Version.
  const latest = snap.runtime.latest ?? null;
  if (latest && compareVersions(latest, snap.runtime.version) > 0) {
    findings.push({
      code: "update-available",
      severity: "info",
      message: `nuikit ${snap.runtime.version} is running; ${latest} is out`,
      next: `download nuikit.zip from github.com/belibathan/nuikit/releases/tag/v${latest.replace(/^v/, "")}, replace [nuikit]/, then \`nuikit upgrade\` (docs/install.md)`,
    });
  }

  // Framework: say what we're assuming.
  findings.push({
    code: "framework",
    severity: "info",
    message: frameworkResource ? `${framework} detected (${frameworkResource} is running)` : "no framework detected: standalone",
    next: packs.some((p) => p.fits && !p.running)
      ? `adapter packs that fit: ${packs
          .filter((p) => p.fits && !p.running)
          .map((p) => `${p.name}${p.shipped ? "" : " (not shipped yet)"}`)
          .join(", ")}`
      : packs.some((p) => p.running)
        ? "every fitting adapter pack is running"
        : "no adapter pack fits; nuikit's own screens and overrides still apply",
  });

  // One line per thing: the same code + resource + message never prints twice.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.code}|${f.resource ?? ""}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  findings.length = 0;
  findings.push(...unique);
  const rank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);

  const intents = Object.entries(snap.intents ?? {})
    .map(([source, byIntent]) => ({ source, byIntent, total: Object.values(byIntent).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);

  const count = (s: ResourceStatus) => reports.filter((r) => r.status === s).length;
  const summary = {
    ui: reports.filter((r) => r.status !== "runtime").length,
    nuikit: count("nuikit") + count("hosted"),
    adapted: count("adapted"),
    override: count("override"),
    untouched: count("untouched"),
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
  };

  return { framework, frameworkResource, runtime: { version: snap.runtime.version, protocol: snap.runtime.protocol, latest }, packs, resources: reports, findings, intents, summary };
}

// ─────────────────────────────────────────── console output

const STATUS_LABEL: Record<ResourceStatus, string> = {
  runtime: "runtime",
  nuikit: "on nuikit",
  hosted: "on nuikit (hosted)",
  adapted: "adapted",
  override: "override",
  untouched: "untouched",
};

/** Plain console lines (no colour codes: the glue adds them). */
export function formatDoctor(rep: DoctorReport): string[] {
  const out: string[] = [];
  out.push(`nuikit ${rep.runtime.version} (protocol ${rep.runtime.protocol})${rep.runtime.latest ? `, latest ${rep.runtime.latest}` : ""}`);
  out.push(`framework: ${rep.framework}${rep.frameworkResource ? ` (${rep.frameworkResource})` : ""}`);
  out.push("adapter packs:");
  for (const p of rep.packs) {
    const state = p.running ? "running" : p.fits ? (p.shipped ? "fits, not installed" : "fits, not shipped yet") : `not needed (${p.library} isn't running)`;
    out.push(`  ${p.name.padEnd(14)} ${state}`);
  }
  out.push(`resources with a UI (${rep.summary.ui}): ${rep.summary.nuikit} on nuikit, ${rep.summary.adapted} adapted, ${rep.summary.override} override, ${rep.summary.untouched} untouched`);
  for (const r of rep.resources) {
    if (r.status === "runtime") continue;
    let label = STATUS_LABEL[r.status];
    if (r.status === "nuikit" && r.protocol !== undefined) label += ` v${r.protocol}${r.level !== undefined ? ` level ${r.level}` : ""}`;
    if (r.via) label += ` (${r.via})`;
    out.push(`  ${r.name.padEnd(24)} ${label}`);
    if (r.next) out.push(`  ${"".padEnd(24)}   → ${r.next}`);
  }
  const problems = rep.findings.filter((f) => f.code !== "framework");
  out.push(`findings: ${rep.summary.errors} error${rep.summary.errors === 1 ? "" : "s"}, ${rep.summary.warnings} warning${rep.summary.warnings === 1 ? "" : "s"}`);
  for (const f of problems) {
    out.push(`  ${f.severity.toUpperCase().padEnd(5)} ${f.message}`);
    out.push(`        → ${f.next}`);
  }
  const fw = rep.findings.find((f) => f.code === "framework");
  if (fw) out.push(`  → ${fw.next}`);
  if (rep.intents.length) {
    out.push("intents drawn since start (by source):");
    for (const i of rep.intents) {
      const parts = Object.entries(i.byIntent)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(", ");
      out.push(`  ${i.source.padEnd(24)} ${i.total}  (${parts})`);
    }
  } else out.push("intents: none counted yet (the intents runtime emits nuikit:intent; play a bit, then run again)");
  const target = (COVERAGE_TARGETS as Record<string, number>)[rep.framework];
  const drawn = rep.intents.reduce((a, i) => a + i.total, 0);
  out.push(`coverage: ${drawn} drawn from ${rep.intents.length} source${rep.intents.length === 1 ? "" : "s"}${target ? `; target ${Math.round(target * 100)}% on ${rep.framework}` : ""} (bench/coverage/run.mjs)`);
  return out;
}
