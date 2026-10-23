/**
 * `nuikit install` / `upgrade` / `uninstall` (docs/install.md): the planner behind the server command that
 * copies the shipped overrides over the real resources, with a backup and a manifest.
 *
 * Pure: the FXServer glue (systems/nuikit/server/install.js) hashes what is on disk, hands it here, and
 * applies the actions it gets back. Nothing here touches the file system, so it runs under vitest.
 *
 * Layout on the server, per overridden resource:
 *   <resource>/<rel>                               our files, merged over the stock UI folder
 *   <resource>/.nuikit-backup/<version>/<rel>      the stock files we replaced, as first seen
 *   <resource>/.nuikit-backup/<version>.edited/…   owner-edited files that `--force` overwrote
 *   <resource>/.nuikit-backup/manifest.json        InstalledManifest: which files are ours, with hashes
 *
 * The shipped side is overrides.json in the nuikit resource (`files`: rel → hash) next to
 * nuikit/overrides/<resource>/<rel>, both written by scripts/pack-systems.mjs.
 */

import { compareVersions } from "./doctor";

/** overrides.json entry (1.1): the page the doctor checks, plus every file the override ships. */
export interface ShippedOverride {
  path: string;
  hash: string;
  /** rel → bytesHash, every file under nuikit/overrides/<resource>/. Absent in zips before 0.9. */
  files?: Record<string, string>;
}

/** `.nuikit-backup/manifest.json`: what nuikit put into this resource. */
export interface InstalledManifest {
  /** nuikit version that wrote the files. */
  version: string;
  /** Folder under .nuikit-backup/ holding the stock files (the version of the first install). */
  backup: string;
  /** rel → bytesHash of the file as we wrote it. */
  files: Record<string, string>;
  installedAt?: string;
}

export type InstallOp =
  | "add" // the resource had no such file
  | "replace" // a stock (or unknown) file: backed up, then written
  | "update" // our own older file: written, no backup needed
  | "keep" // already the shipped bytes
  | "skip-edited" // the owner changed our file; left alone (use --force)
  | "force-edited" // the owner's edit saved to <backup>.edited/, then written
  | "restore" // a file we no longer ship: the stock copy comes back
  | "remove"; // a file we no longer ship and the resource never had

export interface InstallAction {
  rel: string;
  op: InstallOp;
  /** Copy the current disk file to the stock backup before writing. */
  backup?: boolean;
}

export interface InstallPlan {
  actions: InstallAction[];
  /** The manifest to write when the plan is applied. */
  manifest: InstalledManifest;
  /** Files left alone because the owner edited them. */
  edited: string[];
  /** Anything is written. */
  changes: number;
}

/** FNV-1a 32-bit over raw bytes, hex. Files are copied byte for byte, so no line-ending normalisation. */
export function bytesHash(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export interface PlanInstallInput {
  /** nuikit version doing the install (the zip's). */
  version: string;
  /** rel → hash of what the zip ships for this resource. */
  shipped: Record<string, string>;
  /** The resource's current manifest, or null on a first install. */
  installed: InstalledManifest | null;
  /** rel → hash of the file on disk now (null when absent), for every rel in shipped and installed.files. */
  disk: Record<string, string | null>;
  /** Overwrite files the owner edited. */
  force?: boolean;
  /** `hasBackup(rel)`: a stock copy exists for a file we no longer ship. */
  hasBackup?: (rel: string) => boolean;
  now?: string;
}

export function planInstall(input: PlanInstallInput): InstallPlan {
  const { version, shipped, installed, disk, force = false } = input;
  const ours = installed?.files ?? {};
  const actions: InstallAction[] = [];
  const edited: string[] = [];
  const files: Record<string, string> = {};
  const rels = Object.keys(shipped).sort();
  for (const rel of rels) {
    const want = shipped[rel]!;
    const have = disk[rel] ?? null;
    const was = ours[rel];
    if (have === null) {
      actions.push({ rel, op: "add" });
      files[rel] = want;
    } else if (have === want) {
      actions.push({ rel, op: "keep" });
      files[rel] = want;
    } else if (was === undefined) {
      // Not ours: the stock file (first install, or the library's update put it back).
      actions.push({ rel, op: "replace", backup: true });
      files[rel] = want;
    } else if (have === was) {
      actions.push({ rel, op: "update" });
      files[rel] = want;
    } else if (force) {
      actions.push({ rel, op: "force-edited", backup: true });
      files[rel] = want;
    } else {
      actions.push({ rel, op: "skip-edited" });
      edited.push(rel);
      files[rel] = was; // still ours as far as the manifest knows; stays flagged next time
    }
  }
  // Files we shipped before and don't any more.
  for (const rel of Object.keys(ours).sort()) {
    if (rel in shipped) continue;
    const have = disk[rel] ?? null;
    if (have === null) continue;
    if (have !== ours[rel] && !force) {
      actions.push({ rel, op: "skip-edited" });
      edited.push(rel);
      files[rel] = ours[rel]!;
      continue;
    }
    actions.push({ rel, op: input.hasBackup?.(rel) ? "restore" : "remove" });
  }
  const changes = actions.filter((a) => a.op !== "keep" && a.op !== "skip-edited").length;
  return {
    actions,
    manifest: { version, backup: installed?.backup ?? version, files, installedAt: input.now ?? new Date().toISOString() },
    edited,
    changes,
  };
}

export interface PlanUninstallInput {
  installed: InstalledManifest;
  disk: Record<string, string | null>;
  hasBackup: (rel: string) => boolean;
}

export interface UninstallPlan {
  actions: InstallAction[];
  /** Files the owner had edited since we wrote them (restored anyway; the edit is lost). */
  edited: string[];
}

export function planUninstall(input: PlanUninstallInput): UninstallPlan {
  const actions: InstallAction[] = [];
  const edited: string[] = [];
  for (const rel of Object.keys(input.installed.files).sort()) {
    const have = input.disk[rel] ?? null;
    if (have !== null && have !== input.installed.files[rel]) edited.push(rel);
    if (input.hasBackup(rel)) actions.push({ rel, op: "restore" });
    else if (have !== null) actions.push({ rel, op: "remove" });
  }
  return { actions, edited };
}

/** Is the installed override behind the zip's version? */
export function overrideOutdated(installed: InstalledManifest | null | undefined, shippedVersion: string): boolean {
  return !!installed && compareVersions(shippedVersion, installed.version) > 0;
}

// ─────────────────────────────────────────── console lines

export interface ResourceOutcome {
  resource: string;
  /** "missing": the resource isn't on this server. "no-files": nothing packaged for it here (a zip from before the
   * files map, or a dev checkout, where `nuikit/overrides/` is only built by the release pack). */
  state: "planned" | "missing" | "no-files" | "not-installed";
  plan?: InstallPlan | UninstallPlan;
}

const VERB: Record<InstallOp, string> = {
  add: "added",
  replace: "replaced (stock backed up)",
  update: "updated",
  keep: "unchanged",
  "skip-edited": "kept: you edited it (use --force to overwrite)",
  "force-edited": "overwritten (your edit saved to .nuikit-backup)",
  restore: "restored from backup",
  remove: "removed",
};

export function formatInstall(outcomes: ResourceOutcome[], opts: { dryRun?: boolean; uninstall?: boolean; version: string }): string[] {
  const out: string[] = [];
  const head = opts.uninstall ? "nuikit uninstall" : `nuikit install ${opts.version}`;
  out.push(`${head}${opts.dryRun ? " (dry run: nothing written)" : ""}`);
  const restart: string[] = [];
  for (const o of outcomes) {
    if (o.state === "missing") {
      out.push(`  ${o.resource.padEnd(24)} not on this server; skipped`);
      continue;
    }
    if (o.state === "no-files") {
      out.push(`  ${o.resource.padEnd(24)} no override files packaged here (a pre-0.9 zip or a dev checkout); install from the release zip, or copy nuikit/overrides/${o.resource}/ by hand`);
      continue;
    }
    if (o.state === "not-installed") {
      out.push(`  ${o.resource.padEnd(24)} nothing installed by nuikit; skipped`);
      continue;
    }
    const plan = o.plan!;
    const counts: Partial<Record<InstallOp, number>> = {};
    for (const a of plan.actions) counts[a.op] = (counts[a.op] ?? 0) + 1;
    const parts = (Object.keys(counts) as InstallOp[]).map((op) => `${counts[op]} ${VERB[op]}`);
    const changes = "changes" in plan ? plan.changes : plan.actions.length;
    out.push(`  ${o.resource.padEnd(24)} ${parts.length ? parts.join(", ") : "nothing to do"}`);
    for (const rel of plan.edited) out.push(`    ${opts.uninstall ? "edited since install, restored anyway" : "edited"}: ${rel}`);
    if (changes > 0) restart.push(o.resource);
  }
  if (!opts.dryRun && restart.length) out.push(`  → \`refresh\`, then ${restart.map((r) => `\`restart ${r}\``).join(", ")}`);
  if (opts.dryRun && restart.length) out.push(`  → run it without --dry-run to write, then \`refresh\` and restart ${restart.join(", ")}`);
  return out;
}
