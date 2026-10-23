/*
 * nuikit: compiles theme.css once on the server and publishes it to every client.
 *
 *   theme.css ──compileTheme()──► GlobalState.nuikitTheme = { version, mode, hash, vars, imports }
 *
 * Every nuikit UI (nuikit.lua), the override pages (client.lua's `theme` NUI callback), the chat
 * theme and the loading screen handover read that one value. Contrast and format problems are
 * printed here, in the server console, instead of in 30 players' F8.
 *
 *   nuikit theme reload   re-read theme.css and repaint every open UI (console, or ace command.nuikit)
 *   nuikit theme          show the current theme's warnings and contrast
 *   nuikit doctor [json]  server/doctor.js: framework, UI resources, conflicts, next steps
 *   nuikit install | upgrade | uninstall [resource…] [--dry-run] [--force]   server/install.js: the overrides
 *
 * compiler.js is nuikit-core's compiler (copied by `pnpm sync`). MIT, https://github.com/belibathan/nuikit
 */
"use strict";

const RESOURCE = GetCurrentResourceName();
const KEY = "nuikitTheme";
const { compileTheme } = globalThis.NuikitTheme;

let last = null;

function log(msg) {
  console.log(`^5[nuikit]^7 ${msg}`);
}

function setState(value) {
  if (typeof GlobalState.set === "function") GlobalState.set(KEY, value, true);
  else GlobalState[KEY] = value;
}

/** Read theme.css, compile it, publish it. Returns the compiled theme (or null on failure). */
function publish(reason) {
  const css = LoadResourceFile(RESOURCE, "theme.css");
  if (!css || css.indexOf("--") === -1) {
    log("^3theme.css is missing or empty; UIs keep their built-in stock theme.^7");
  }
  let theme;
  try {
    theme = compileTheme(css || "");
  } catch (err) {
    // Clients fall back to reading theme.css themselves (older behaviour).
    log(`^1couldn't compile theme.css: ${err && err.message ? err.message : err}^7`);
    setState(null);
    last = null;
    return null;
  }
  const payload = { version: theme.version, mode: theme.mode, hash: theme.hash, vars: theme.vars, imports: theme.imports };
  setState(payload);
  last = theme;
  const failed = theme.contrast.filter((c) => !c.ok).length;
  log(
    `theme ${reason}: tokens v${theme.version}, ${Object.keys(theme.vars).length} values, ${theme.mode} set, ` +
      `${theme.contrast.length - failed}/${theme.contrast.length} contrast checks pass (${theme.hash})`,
  );
  for (const w of theme.warnings) log(`^3${w}^7`);
  publishLooks(css || "");
  return theme;
}

// ───────────────────────────────── player looks
// What a player may pick instead of the server theme (pause › Settings › Look), compiled here like the theme:
//
//   setr nuikit_identities "graphite,studio,arcade"   identities from nuikit/themes/*.css (default: none)
//   setr nuikit_treatments "slab,glass"                treatments over the server theme or an identity (default: none)
//
// GlobalState.nuikitLooks = { identities, treatments, themes = { ["<identity|server>|<treatment|>"] = compiled } }.
// Clients pick the one matching the player's prefs (nuikit.lua NUI.theme); unknown or disallowed picks get the
// server theme. Every combination is compiled once, at most MAX_LOOKS of them.
const LOOKS_KEY = "nuikitLooks";
const TREATMENTS = ["soft", "glass", "plate", "slab"];
// Renamed theme ids, kept for one minor (docs/next/decisions.md): "ink" is the theme now called "default".
const THEME_ALIASES = { ink: "default" };
const MAX_LOOKS = 24;

function list(name) {
  const raw = typeof GetConvar === "function" ? String(GetConvar(name, "") || "") : "";
  return [...new Set(raw.split(/[\s,|]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
}

function payloadOf(t) {
  return { version: t.version, mode: t.mode, hash: t.hash, vars: t.vars, imports: t.imports };
}

function publishLooks(serverCss) {
  const identities = [];
  const sources = { server: serverCss };
  for (const raw of list("nuikit_identities")) {
    if (!/^[a-z0-9_-]{1,32}$/.test(raw)) continue;
    const id = THEME_ALIASES[raw] ?? raw;
    if (id !== raw) log(`^3nuikit_identities: "${raw}" was renamed "${id}" in 0.9; the old id still works for one minor.^7`);
    const css = LoadResourceFile(RESOURCE, `themes/${id}.css`);
    if (!css || css.indexOf("--") === -1) {
      log(`^3nuikit_identities: no themes/${id}.css; ${id} is left out.^7`);
      continue;
    }
    identities.push(id);
    sources[id] = css;
  }
  const treatments = list("nuikit_treatments").filter((t) => {
    if (TREATMENTS.includes(t)) return true;
    log(`^3nuikit_treatments: ${t} isn't a treatment (${TREATMENTS.join(", ")}); it is left out.^7`);
    return false;
  });
  const themes = {};
  let count = 0;
  for (const base of ["server", ...identities]) {
    for (const t of ["", ...treatments]) {
      if (base === "server" && t === "") continue; // the server theme itself: GlobalState.nuikitTheme
      if (++count > MAX_LOOKS) break;
      try {
        // a treatment fills defaults under the theme's own values (tokens 1.4), so it goes last as a plain override
        const css = t ? `${sources[base]}\n.dark { --nk-treatment: ${t}; }` : sources[base];
        themes[`${base}|${t}`] = payloadOf(compileTheme(css));
      } catch (err) {
        log(`^3look ${base}|${t} didn't compile: ${err && err.message ? err.message : err}^7`);
      }
    }
  }
  if (count > MAX_LOOKS) log(`^3${count} looks asked for, ${MAX_LOOKS} compiled: shorten nuikit_identities or nuikit_treatments.^7`);
  const value = { identities, treatments, themes };
  if (typeof GlobalState.set === "function") GlobalState.set(LOOKS_KEY, value, true);
  else GlobalState[LOOKS_KEY] = value;
  if (identities.length || treatments.length) log(`looks: ${identities.length} identities, ${treatments.length} treatments, ${Object.keys(themes).length} compiled`);
}

function report(reply) {
  if (!last) return reply("no compiled theme (see the errors above)");
  reply(`tokens v${last.version}, ${last.mode} set, hash ${last.hash}`);
  for (const c of last.contrast) reply(`${c.ok ? "ok  " : "LOW "} ${c.fg} on ${c.bg}: ${c.ratio.toFixed(2)}:1 (min ${c.min}:1)`);
  if (!last.warnings.length) reply("no warnings");
  for (const w of last.warnings) reply(w);
}

function command(source, args) {
  const reply = (msg) => {
    if (source > 0) emitNet("chat:addMessage", source, { args: ["nuikit", msg] });
    else log(msg);
  };
  const [sub, action] = args;
  if (sub === "theme" && action === "reload") {
    const t = publish("reloaded");
    reply(t ? `theme reloaded (${t.warnings.length} warning${t.warnings.length === 1 ? "" : "s"})` : "theme reload failed; see the server console");
  } else if (sub === "theme") report(reply);
  // ── doctor (server/doctor.js, docs/doctor.md) ──
  else if (sub === "doctor" && globalThis.NuikitDoctor) globalThis.NuikitDoctor.run(reply, action === "json");
  // ── end doctor ──
  // ── install (server/install.js, docs/install.md): console only, it writes to disk ──
  else if ((sub === "install" || sub === "upgrade" || sub === "uninstall") && globalThis.NuikitInstall) {
    if (source > 0) return reply("nuikit install runs from the server console (it writes files)");
    if (sub === "uninstall") globalThis.NuikitInstall.uninstall(reply, args.slice(1));
    else globalThis.NuikitInstall.install(reply, args.slice(1));
  }
  // ── end install ──
  else reply("usage: nuikit theme [reload] | nuikit doctor [json] | nuikit install|upgrade|uninstall [resource…] [--dry-run] [--force]");
}

// Console, or players with the ace `command.nuikit` (add_ace group.admin command.nuikit allow).
RegisterCommand("nuikit", command, true);

// Players type /nuikit in game, where nuikit's client command takes it; it forwards theme
// subcommands here and the same ace decides.
onNet("nuikit:command", (args) => {
  const src = global.source;
  if (!Array.isArray(args) || !IsPlayerAceAllowed(String(src), "command.nuikit")) {
    emitNet("chat:addMessage", src, { args: ["nuikit", "you don't have permission (command.nuikit)"] });
    return;
  }
  command(src, args.map(String));
});

// ── doctor: the compiled theme's checks (server/doctor.js reads them) ──
globalThis.__nuikitTheme = () => last;
// ── end doctor ──

exports("getTheme", () => last && { version: last.version, mode: last.mode, hash: last.hash, vars: last.vars, imports: last.imports, warnings: last.warnings });
exports("reloadTheme", () => !!publish("reloaded"));

publish("compiled");

// ───────────────────────────────── server context (currency, locale)
// What every UI formats money and numbers with (docs/protocol.md §7.2): published next to the
// theme, read by bridge.lua and sent to pages as `nuikit:context`.
//
//   setr nuikit_currency EUR      ISO 4217 code, default USD
//   setr nuikit_locale de-DE      BCP 47 tag, default en-US
{
  const CONTEXT_KEY = "nuikitContext";
  const convar = (name, fallback) => (typeof GetConvar === "function" ? String(GetConvar(name, fallback) || fallback) : fallback).trim();

  let currency = convar("nuikit_currency", "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    log(`^3nuikit_currency "${currency}" is not an ISO 4217 code (three letters, e.g. EUR); USD is used.^7`);
    currency = "USD";
  }
  let locale = convar("nuikit_locale", "en-US");
  try {
    // Canonical form (en_us → en-US); throws on a malformed tag.
    locale = Intl.getCanonicalLocales(locale.replace(/_/g, "-"))[0] || "en-US";
  } catch {
    log(`^3nuikit_locale "${locale}" is not a BCP 47 tag (e.g. de-DE); en-US is used.^7`);
    locale = "en-US";
  }

  const context = { currency, locale };
  if (typeof GlobalState.set === "function") GlobalState.set(CONTEXT_KEY, context, true);
  else GlobalState[CONTEXT_KEY] = context;
  log(`context: currency ${currency}, locale ${locale}`);
  exports("getContext", () => ({ currency, locale }));
}
