import type { DomainSpec } from "./types";

/** Keys: bindings a resource declares in one place, listed by any page. */
export default {
  js: "keys",
  lua: "keys",
  title: "Keys",
  doc: "Declare key bindings in one place; any page lists them; players rebind in GTA's settings.",
  docs: "docs/settings.md",
  entries: [
    { name: "define", kind: "call", doc: "Register +/- commands and the key mapping; returns binding().", lua: "nk.keys.define", sig: { lua: "nk.keys.define({ id, label, key, mapper?, onPress, onRelease?, command? })" }, only: "lua only: key mappings are natives", since: "0.8.0" },
    { name: "label", kind: "call", doc: "An instructional button string as display text.", lua: "nk.keys.label", only: "lua only: natives", since: "0.8.0" },
    { name: "list", kind: "call", doc: "Every resource's keys.", lua: "nk.keys.list", js: "loadKeys", scope: "nuikit", since: "0.8.0" },
    { name: "mock", kind: "call", doc: "Dev: the keys the browser pretends exist.", js: "mockKeys", only: "js only: the browser has no Lua", since: "0.8.0" },
    { name: "useKeys", kind: "hook", doc: "Every resource's keys, loaded.", js: "useKeys", only: "js only: React", since: "0.8.0" },
    { name: "KeyBinding", kind: "type", doc: "resource, id, label, default, binding, mapper.", js: "KeyBinding", only: "js only: Lua tables are untyped", since: "0.8.0" },
  ],
  events: [{ name: "nuikit:keys:list", dir: "page→lua", payload: "{}", reply: "{ keys: KeyBinding[] }", sender: "any", doc: "https://nuikit/keys.", wire: "keys", since: "0.8.0" }],
  rules: ["A mapping belongs to the resource that registers it; a stopped resource's keys leave the list."],
} satisfies DomainSpec;
