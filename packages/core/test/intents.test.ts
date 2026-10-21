// The intent schemas (packages/core/intents/*.json) through the TypeScript validator and the store.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __reset, emit } from "../src";
import { INTENT_KINDS, INTENT_SCHEMAS, INTENT_VERSIONS, __resetIntentStore, createIntentStore, validateIntent, withIntentDefaults } from "../src/intents";

const messages = (issues: { path: string; message: string }[]) => issues.map((i) => `${i.path}: ${i.message}`);

describe("intent schemas", () => {
  it("has the nine intents of architecture.md §2, each versioned", () => {
    expect([...INTENT_KINDS]).toEqual(["notify", "menu", "input", "confirm", "progress", "prompt", "target", "radial", "challenge"]);
    for (const k of INTENT_KINDS) expect(INTENT_VERSIONS[k]).toBeGreaterThanOrEqual(1);
  });

  it("generated code is current (run `pnpm intents` in packages/core after editing a schema)", () => {
    const dir = fileURLToPath(new URL("../intents/", import.meta.url));
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_"))) {
      const json = JSON.parse(readFileSync(dir + f, "utf8"));
      const gen = INTENT_SCHEMAS[json.name as keyof typeof INTENT_SCHEMAS];
      expect(gen, f).toBeDefined();
      expect(gen.version, f).toBe(json.version);
      expect(gen.props, f).toEqual(json.props);
    }
  });
});

describe("validateIntent", () => {
  it("accepts every ox_lib notify field (superset)", () => {
    expect(
      validateIntent("notify", {
        id: "pay",
        title: "Paid",
        description: "**$500**",
        status: "success",
        icon: ["fas", "coins"],
        iconColor: "var(--success)",
        iconAnimation: "beat",
        alignIcon: "top",
        duration: 3000,
        showDuration: false,
        position: "right-center",
        style: { backgroundColor: "red" },
        sound: { name: "x" },
      }),
    ).toEqual([]);
  });

  it("reports wrong types, bad words and ranges with their path", () => {
    expect(messages(validateIntent("notify", { title: 5, status: "loud", duration: -1, position: "nowhere" }))).toEqual([
      "title: expected a string, got number",
      "status: expected one of info, success, warning, error, got \"loud\"",
      "duration: must be ≥ 0",
      "position: expected one of top-left, top-center, top-right, center-left, center-right, bottom-left, bottom-center, bottom-right, center, top, bottom, left, right, left-center, right-center, got \"nowhere\"",
    ]);
    expect(messages(validateIntent("notify", { duration: 1.5 }))).toEqual(["duration: expected a whole number, got 1.5"]);
  });

  it("requires what the schema requires, including inside lists", () => {
    expect(messages(validateIntent("menu", {}))).toEqual(["title: is required", "items: is required"]);
    expect(messages(validateIntent("menu", { title: "Garage", items: [] }))).toEqual(["items: needs at least 1 entry"]);
    expect(messages(validateIntent("target", { options: [{ icon: "car" }] }))).toEqual(["options[1].label: is required"]);
  });

  it("validates nested items through `self` (inline submenus)", () => {
    expect(validateIntent("menu", { title: "Garage", items: [{ label: "Cars", items: [{ label: "Sultan", items: [{ label: "Spawn" }] }] }] })).toEqual([]);
    expect(messages(validateIntent("menu", { title: "Garage", items: [{ label: "Cars", items: [{ label: 7 }] }] }))).toEqual(["items[1].items[1].label: expected a string, got number"]);
  });

  it("oneOf: the icon forms and the difficulty forms", () => {
    expect(validateIntent("menu", { title: "t", items: [{ label: "a", icon: "car" }, { label: "b", icon: ["fab", "discord"] }, { label: "c", icon: { prefix: "fas", iconName: "car" } }] })).toEqual([]);
    expect(messages(validateIntent("menu", { title: "t", items: [{ label: "a", icon: 3 }] }))).toEqual(["items[1].icon: expected string or a list or a table, got number"]);
    expect(validateIntent("challenge", { difficulty: "hard" })).toEqual([]);
    expect(validateIntent("challenge", { difficulty: [{ areaSize: 30, speedMultiplier: 2 }, "easy"], keys: ["w", "a"] })).toEqual([]);
    expect(messages(validateIntent("challenge", { difficulty: "impossible" }))).toEqual(["difficulty: expected difficulty or a list, got string"]);
  });

  it("lets unknown keys through (adapters carry library fields; newer scripts on an older runtime)", () => {
    expect(validateIntent("notify", { title: "x", oxOnlyThing: true })).toEqual([]);
    expect(validateIntent("menu", { title: "t", items: [{ label: "a", event: "x", serverEvent: "y", args: { any: 1 } }] })).toEqual([]);
  });

  it("every ox_lib input row type is expressible", () => {
    const fields = [
      { type: "text", label: "Name", required: true, password: true, min: 2, max: 20 },
      { type: "textarea", label: "Bio", autosize: true, minLength: 0, maxLength: 200 },
      { type: "number", label: "Qty", min: 1, max: 10, step: 1, precision: 0, default: 1 },
      { type: "checkbox", label: "Agree", checked: true },
      { type: "select", label: "Colour", options: [{ value: "r", label: "Red" }, { value: "g" }], clearable: true, searchable: true, default: "r" },
      { type: "multi-select", label: "Tags", options: [{ value: "a" }], maxSelected: 2, default: ["a"] },
      { type: "slider", label: "Vol", min: 0, max: 100, step: 5, default: 50 },
      { type: "color", label: "Paint", format: "rgba", default: "#ff0000" },
      { type: "date", label: "Day", format: "DD/MM/YYYY", returnString: true, default: true, min: "2020-01-01" },
      { type: "date-range", label: "Stay" },
      { type: "time", label: "At", format: "24" },
    ];
    expect(validateIntent("input", { title: "Form", fields, size: "md", allowCancel: false })).toEqual([]);
    expect(messages(validateIntent("input", { title: "Form", fields: [{ type: "image" }] }))).toEqual([
      "fields[1].type: expected one of text, textarea, number, checkbox, select, multi-select, slider, color, date, date-range, time, got \"image\"",
    ]);
  });

  it("unknown intent", () => {
    expect(messages(validateIntent("toast" as never, {}))).toEqual([': unknown intent "toast" (one of notify, menu, input, confirm, progress, prompt, target, radial, challenge)']);
  });

  it("withIntentDefaults fills the top-level defaults only", () => {
    expect(withIntentDefaults("confirm", { title: "Sure?" })).toEqual({ title: "Sure?", tone: "primary", size: "md", centered: true, cancel: true });
    expect(withIntentDefaults("progress", { duration: 100, style: "ring" })).toMatchObject({ style: "ring", position: "bottom", cancel: false, cancelKey: "X", tone: "primary" });
  });
});

describe("intent store", () => {
  beforeEach(() => {
    __reset();
    __resetIntentStore();
  });
  afterEach(() => __reset());

  const open = (id: string, kind: string, props: object, resource = "shop") => emit("nuikit:intent", { op: "open", intent: { id, kind, props, resource, seq: 0 } } as never);

  it("keeps one stack per kind, bottom → top, and notifies that kind's subscribers", () => {
    const s = createIntentStore();
    const seen: number[] = [];
    s.subscribe("notify", () => seen.push(s.list("notify").length));
    open("shop#1", "notify", { title: "a" });
    open("shop#2", "notify", { title: "b" });
    open("bank#1", "menu", { title: "m", items: [{ label: "x" }] }, "bank");
    expect(s.list("notify").map((i) => i.id)).toEqual(["shop#1", "shop#2"]);
    expect(s.list("menu").map((i) => i.resource)).toEqual(["bank"]);
    expect(seen).toEqual([1, 2]);
    expect(s.all().map((i) => i.id)).toEqual(["shop#1", "shop#2", "bank#1"]);
  });

  it("update merges props; cancel drops; sync replaces everything", () => {
    const s = createIntentStore();
    open("shop#1", "progress", { label: "Fix", duration: 5000 });
    emit("nuikit:intent", { op: "update", id: "shop#1", props: { value: 40 } } as never);
    expect(s.list("progress")[0]!.props).toEqual({ label: "Fix", duration: 5000, value: 40 });
    emit("nuikit:intent", { op: "cancel", id: "shop#1" } as never);
    expect(s.list("progress")).toEqual([]);
    emit("nuikit:intent", { op: "sync", intents: [{ id: "a#1", kind: "prompt", props: { label: "Open" }, resource: "a", seq: 3 }] } as never);
    expect(s.list("prompt").map((i) => i.id)).toEqual(["a#1"]);
  });

  it("resolve / cancel / emit post to Lua (logged in the browser) and resolve drops the intent", () => {
    const s = createIntentStore();
    const posts: [string, unknown][] = [];
    s.onPost((n, b) => posts.push([n, b]));
    open("shop#1", "menu", { title: "m", items: [{ label: "x" }] });
    s.emit("shop#1", "change", { index: 1 });
    s.resolve("shop#1", { index: 1, id: "1" });
    s.resolve("shop#1", { index: 1, id: "1" }); // already gone: nothing
    s.cancel("nope");
    expect(posts).toEqual([
      ["nuikit:intent:event", { id: "shop#1", event: "change", data: { index: 1 } }],
      ["nuikit:intent:resolve", { id: "shop#1", result: { index: 1, id: "1" }, data: undefined }],
    ]);
    expect(s.list("menu")).toEqual([]);
  });

  it("back: a registered renderer decides; otherwise the top intent of the kind is cancelled with reason escape", () => {
    const s = createIntentStore();
    const posts: unknown[] = [];
    s.onPost((_n, b) => posts.push(b));
    open("shop#1", "confirm", { title: "a" });
    open("shop#2", "confirm", { title: "b" });
    s.back("confirm");
    expect(posts).toEqual([{ id: "shop#2", reason: "escape" }]);
    let decided = 0;
    s.onBack("confirm", () => decided++);
    s.back("confirm");
    expect(decided).toBe(1);
    expect(s.list("confirm").map((i) => i.id)).toEqual(["shop#1"]);
  });
});
