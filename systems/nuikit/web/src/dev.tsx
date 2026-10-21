// The game, faked for browser development. Press ` for the devtools; ?fixture=<name> opens one
// intent (used by scripts/screenshots.mjs): notify, menu, menu-keyboard, input, confirm, progress,
// progress-ring, prompt, target, radial, challenge, all.
// window.nk.open(kind, props) opens any intent from the console or Playwright, the way Lua would.
import { emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { createIntentStore, type IntentKind, type IntentMessage, type IntentProps } from "nuikit-core/intents";
import { useEffect } from "react";
import { rendererPacks } from "./packs";

const store = createIntentStore();
let seq = 0;
let ran = false;

/** Open an intent as nuikit's Lua would: the message, and the surface that gives it focus. */
export function open<K extends IntentKind>(kind: K, props: IntentProps[K], resource = "dev"): string {
  const id = `${resource}#${++seq}`;
  emit("nuikit:intent", { op: "open", intent: { id, kind, resource, props, seq } } as IntentMessage);
  const surface = surfaceFor(kind, props as Record<string, unknown>);
  if (surface) void openSurface(surface);
  return id;
}

function surfaceFor(kind: IntentKind, props: Record<string, unknown>) {
  if (kind === "menu") return props.input === "cursor" ? "intent:menu:cursor" : props.input === "keyboard" ? "intent:menu:keyboard" : "intent:menu";
  if (kind === "target") return props.open ? "intent:target" : null;
  if (["input", "confirm", "radial", "challenge"].includes(kind)) return `intent:${kind}`;
  return null;
}

const garage: IntentProps["menu"] = {
  title: "Garage",
  description: "Vehicles stored at Legion Square",
  icon: "car",
  items: [
    { label: "Sultan RS", description: "Plate 46ABC123", icon: "car", meta: "$1,200", progress: 72, colorScheme: "success", metadata: [{ label: "Fuel", value: "72%", progress: 72 }, { label: "Engine", value: "Good" }], image: "https://picsum.photos/seed/sultan/320/180" },
    { label: "Blista Compact", description: "Plate 11XYZ999", icon: "car", meta: "$450", progress: 20, colorScheme: "warning", metadata: ["Needs a wash", "Fuel 20%"] },
    { label: "Paint shop", icon: "fas fa-paint-roller", items: [{ label: "Red", kbd: "1" }, { label: "Black", kbd: "2" }, { label: "Chrome", description: "Needs the body shop", disabled: true }] },
    { label: "Insurance", icon: "shield", description: "Renew this month", arrow: true, menu: "insurance" },
    { label: "Private", icon: "lock", readOnly: true, description: "A note that can't be chosen" },
    { label: "Impounded", icon: "siren", disabled: true, meta: "2 cars" },
  ],
};

const listMenu: IntentProps["menu"] = {
  title: "Settings",
  input: "keyboard",
  position: "top-left",
  startIndex: 2,
  items: [
    { label: "Voice range", values: ["Whisper", "Normal", "Shout"], defaultIndex: 2, description: "Left and right to change" },
    { label: "Show HUD", checked: true },
    { label: "Quality", values: [{ label: "Low" }, { label: "High", description: "Needs a restart" }] },
    { label: "Fuel", progress: 45, colorScheme: "warning", close: false },
    { label: "Apply", icon: "check" },
  ],
};

const form: IntentProps["input"] = {
  title: "Register vehicle",
  description: "The DMV needs a few details",
  size: "sm",
  fields: [
    { type: "text", label: "Owner", placeholder: "Full name", required: true, icon: "user" },
    { type: "number", label: "Mileage", min: 0, max: 999999, default: 1200 },
    { type: "select", label: "Class", options: [{ value: "sports", label: "Sports" }, { value: "sedan", label: "Sedan" }, { value: "suv", label: "SUV" }], default: "sports", clearable: true },
    { type: "slider", label: "Tint", min: 0, max: 100, step: 5, default: 30 },
    { type: "checkbox", label: "Insured", checked: true },
    { type: "date", label: "Registered", default: true },
    { type: "color", label: "Paint", default: "#4dabf7" },
  ],
};

const radial: IntentProps["radial"] = {
  label: "Actions",
  items: [
    { label: "Phone", icon: "phone" },
    { label: "Vehicle", icon: "car", items: [{ label: "Lock", icon: "lock" }, { label: "Engine", icon: "key" }, { label: "Trunk", icon: "box" }] },
    { label: "Wallet", icon: "wallet" },
    { label: "Emotes", icon: "hand", disabled: true },
    { label: "Police", icon: "siren", menu: "police" },
    { label: "Clothes", icon: "shirt", keepOpen: true },
  ],
};

const FIXTURES: Record<string, () => void> = {
  notify() {
    open("notify", { title: "Paid", description: "**$500** to Los Santos Customs", status: "success" });
    open("notify", { title: "Low fuel", description: "Find a station", status: "warning", position: "top-right" });
    open("notify", { title: "Call failed", status: "error", icon: "phone", duration: 8000 });
    open("notify", { description: "A plain line with no title and *no* status", position: "bottom-center" });
    open("notify", { item: { name: "Water", count: 2, icon: "box" }, position: "bottom-right" });
    open("notify", { title: "New message", description: "From Niko", icon: "fas fa-envelope", iconColor: "var(--info)", position: "center-left" });
  },
  menu: () => void open("menu", garage),
  "menu-keyboard": () => void open("menu", listMenu),
  "menu-cursor": () => void open("menu", { ...garage, input: "cursor", canClose: false, menu: "main" }),
  "menu-esx": () =>
    void open("menu", {
      title: "Bank",
      position: "center",
      items: [
        { kind: "header", label: "Account" },
        { label: "Balance", meta: "$13,370", readOnly: true },
        { kind: "header", label: "Transfer" },
        { label: "Amount", field: { type: "number", min: 1, max: 5000, default: 100 } },
        { label: "To", field: { type: "select", options: [{ value: "1", label: "Niko" }, { value: "2", label: "Roman" }] } },
        { label: "Priority", field: { type: "slider", min: 0, max: 10, default: 3 } },
        { label: "Send", icon: "check" },
      ],
    }),
  "menu-preview": () => void open("menu", { ...listMenu, focus: false, title: "Preview" }),
  input: () => void open("input", form),
  "input-ox": () =>
    void open("input", {
      title: "ox inputDialog",
      size: "md",
      allowCancel: false,
      fields: [
        { type: "text", label: "Password", password: true, required: true, min: 4, max: 20 },
        { type: "textarea", label: "Notes", autosize: true, min: 2 },
        { type: "multi-select", label: "Tags", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }], maxSelected: 2 },
        { type: "date-range", label: "Stay" },
        { type: "time", label: "Pickup", format: "12", clearable: true },
      ],
    }),
  "input-qb": () =>
    void open("input", {
      title: "qb-input",
      submitLabel: "Submit",
      fields: [
        { type: "password", label: "PIN", required: true },
        { type: "radio", label: "Account", options: [{ value: "cash", label: "Cash" }, { value: "bank", label: "Bank" }], default: "cash" },
        { type: "checkbox-group", label: "Options", options: [{ value: "a", label: "Receipt" }, { value: "b", label: "Notify" }], default: ["b"] },
      ],
    }),
  confirm: () => void open("confirm", { title: "Sell the Sultan?", description: "You'll get **$12,400**. This can't be undone.", tone: "destructive", labels: { confirm: "Sell" } }),
  "confirm-ox": () => void open("confirm", { title: "Notice", description: "The server restarts in 5 minutes.\n\nSave your work.", cancel: false, centered: false, size: "sm" }),
  progress: () => void open("progress", { label: "Repairing engine", duration: 60000, cancel: true }),
  "progress-ring": () => void open("progress", { label: "Lockpicking", duration: 60000, style: "ring", position: "center", tone: "warning" }),
  "progress-driven": () => void open("progress", { label: "Downloading", duration: 1000, value: 40, showPercent: true }),
  prompt() {
    open("prompt", { label: "Open garage", keys: ["E"] });
    open("prompt", { label: "Talk", keys: ["G"], description: "Hold to whisper", hold: 1500, progress: 0.4, active: true, position: "center-right" });
    open("prompt", { label: "Press to pick up", keys: ["E"], surface: "panel", position: "bottom-center", icon: "hand" });
    open("prompt", { label: "Locked", keys: ["F"], disabled: true, surface: "hud", position: "center-left" });
    open("prompt", { label: "Pressed", keys: ["H"], pressed: true, status: "success", position: "top-center" });
  },
  target: () =>
    void open("target", {
      title: "Sultan RS",
      active: true,
      open: true,
      options: [
        { label: "Open trunk", icon: "box" },
        { label: "Lock", icon: "lock", description: "You have the keys" },
        { label: "Services", icon: "wrench", items: [{ label: "Repair", icon: "wrench" }, { label: "Wash", icon: "fas fa-droplet" }] },
        { label: "Steal", icon: "ban", disabled: true },
      ],
    }),
  "target-eye": () => void open("target", { active: true, options: [{ label: "Open" }] }),
  radial: () => void open("radial", radial),
  challenge: () => void open("challenge", { difficulty: ["easy", { areaSize: 30, speedMultiplier: 2 }], keys: ["E", "Q"], label: "Hotwire" }),
  all() {
    FIXTURES.notify!();
    FIXTURES.prompt!();
    FIXTURES.progress!();
    open("menu", garage);
  },
};

const mocks = defineMocks({
  events: {},
  callbacks: {
    "nuikit:intent:resolve": { ok: true },
    "nuikit:intent:event": { ok: true },
    "nuikit:intent:sync": { ok: true, count: 0 },
    "nuikit:renderer:sync": { ok: true },
    "nuikit:renderer:failed": { ok: true },
  },
});

declare global {
  interface Window {
    nk?: { open: typeof open; fixture: (name: string) => void; store: typeof store; posts: { name: string; body: unknown }[]; packs: ReturnType<typeof rendererPacks> };
  }
}

export default function Dev() {
  useEffect(() => {
    const posts: { name: string; body: unknown }[] = [];
    const off = store.onPost((name, body) => {
      posts.push({ name, body });
      console.debug("[nuikit →lua]", name, body);
    });
    window.nk = { open, fixture: (name) => FIXTURES[name]?.(), store, posts, packs: rendererPacks() };
    // ?pack=<url>[&kind=notify]: load a renderer pack's built module.js as client/renderers.lua would.
    const packUrl = new URLSearchParams(location.search).get("pack");
    if (packUrl && !ran) {
      const kind = (new URLSearchParams(location.search).get("kind") ?? "notify") as IntentKind;
      void rendererPacks().apply({ [kind]: { resource: "pack", url: packUrl, gen: 1 } });
    }
    // StrictMode runs effects twice in dev: open the URL's fixture once.
    const fixture = new URLSearchParams(location.search).get("fixture");
    if (fixture && !ran) {
      ran = true;
      FIXTURES[fixture]?.();
    }
    return off;
  }, []);
  return <NuiDevtools {...mocks} scene="day" />;
}
