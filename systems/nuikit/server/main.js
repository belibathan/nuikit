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
  return theme;
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
  else reply("usage: nuikit theme [reload] | nuikit doctor [json]");
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
