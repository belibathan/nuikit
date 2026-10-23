import type { DomainSpec } from "./types";

/** Player: one shape for every framework (Qbox, QBCore, ESX, standalone, custom), and the server context. */
export default {
  js: "player",
  lua: "player",
  title: "Player",
  doc: "One player shape for every framework, and the server's currency and locale.",
  docs: "docs/protocol.md#7-context",
  entries: [
    { name: "get", kind: "call", doc: "The current player.", lua: "nk.player.get", js: "getPlayer", since: "0.4.0" },
    { name: "onChange", kind: "call", doc: "Called after every change.", lua: "nk.player.onChange", js: "onPlayer", sig: { lua: "nk.player.onChange(fn(player))", js: "onPlayer(fn): () => void" }, since: "0.4.0" },
    { name: "context", kind: "call", doc: "The server's currency (ISO 4217) and locale (BCP 47).", lua: "nk.player.context", js: "getContext", since: "0.5.0" },
    { name: "onContext", kind: "call", doc: "Called when the context changes.", js: "onContext", only: "js only: Lua reads GlobalState", since: "0.5.0" },
    { name: "set", kind: "call", doc: "Merge fields into the player and push it if it changed.", lua: "nk.player.set", only: "lua only: Lua owns the player", since: "0.4.0" },
    { name: "resend", kind: "call", doc: "Send the player and context again.", lua: "nk.player.resend", only: "lua only: Lua owns the player", since: "0.4.0" },
    { name: "poll", kind: "call", doc: "Read what natives and state bags own now.", lua: "nk.player.poll", only: "lua only: natives", since: "0.4.0" },
    { name: "framework", kind: "const", doc: "'qbox' | 'qbcore' | 'esx' | 'standalone' | a custom framework's resource.", lua: "nk.player.framework", only: "lua only: detection runs in Lua", since: "0.4.0" },
    { name: "defaults", kind: "const", doc: "The player and context before Lua's first message.", js: "DEFAULT_PLAYER", also: ["DEFAULT_CONTEXT"], only: "js only: the page's first paint", since: "0.4.0" },
    { name: "usePlayer", kind: "hook", doc: "The player, live.", js: "usePlayer", only: "js only: React", since: "0.4.0" },
    { name: "useNuiContext", kind: "hook", doc: "The server context, live.", js: "useNuiContext", only: "js only: React", since: "0.5.0" },
    { name: "NuiPlayer", kind: "type", doc: "loaded, id, name, health, armor, hunger, thirst, stress, cash, bank, job, gang, dead, voice.", js: "NuiPlayer", only: "js only: Lua tables are untyped", since: "0.4.0" },
    { name: "NuiContext", kind: "type", doc: "currency, locale.", js: "NuiContext", only: "js only: Lua tables are untyped", since: "0.5.0" },
  ],
  events: [
    { name: "nuikit:player:changed", dir: "lua→page", payload: "NuiPlayer", sender: "runtime", doc: "The player changed (only when something did).", wire: "nuikit:player", since: "0.4.0" },
    { name: "nuikit:player:context", dir: "lua→page", payload: "NuiContext", sender: "runtime", doc: "The server context, on load and on change.", wire: "nuikit:context", since: "0.5.0" },
    { name: "nuikit:player:framework", dir: "local", payload: "(fields: Partial<NuiPlayer>)", sender: "any", doc: "A custom framework pushes player fields (docs/adapters/framework-sdk.md).", wire: "nuikit:framework:update", since: "0.6.0" },
  ],
  rules: ["Read framework data only through the bridge; a UI never asks a framework directly.", "Loaded on first use: a resource that never reads nk.player doesn't pay for the bridge."],
} satisfies DomainSpec;
