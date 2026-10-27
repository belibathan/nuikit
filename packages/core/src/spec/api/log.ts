import type { DomainSpec } from "./types";

/** Log: the runtime's console lines, colour + [nuikit:resource] + text + ^7 (fivem-foundation §7). */
export default {
  js: "log",
  lua: "log",
  title: "Log",
  doc: "Console lines from Lua, one shape: colour + [nuikit:<resource>] + text + ^7. Debug lines only with setr nuikit_debug 1.",
  docs: "docs/next/foundation-gaps.md",
  entries: [
    { name: "info", kind: "call", doc: "A cyan line.", lua: "nk.log.info", sig: { lua: "nk.log.info(message)" }, only: "lua only: the console is the server's or the client's F8", since: "0.9.1" },
    { name: "success", kind: "call", doc: "A green line.", lua: "nk.log.success", sig: { lua: "nk.log.success(message)" }, only: "lua only: the console is the server's or the client's F8", since: "0.9.1" },
    { name: "warn", kind: "call", doc: "A yellow line.", lua: "nk.log.warn", sig: { lua: "nk.log.warn(message)" }, only: "lua only: the console is the server's or the client's F8", since: "0.9.1" },
    { name: "error", kind: "call", doc: "A red line.", lua: "nk.log.error", sig: { lua: "nk.log.error(message)" }, only: "lua only: the console is the server's or the client's F8", since: "0.9.1" },
    { name: "debug", kind: "call", doc: "A purple line, only with setr nuikit_debug 1.", lua: "nk.log.debug", sig: { lua: "nk.log.debug(message)" }, only: "lua only: the console is the server's or the client's F8", since: "0.9.1" },
  ],
  events: [],
  rules: ["Every console line the runtime or a nuikit resource writes goes through nk.log: no bare print with its own colour codes."],
} satisfies DomainSpec;
