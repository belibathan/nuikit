// ox_inventory's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload ox_inventory's Lua really sends (docs/ox-inventory-protocol.md).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { browserReplies } from "@/lib/nui";
import type { Slot } from "@/lib/types";
import { inv } from "@/state/inventory";

const now = Math.floor(Date.now() / 1000);
const IMAGES = "/__ox_images"; // vite.config.ts serves these in dev

const item = (label: string, extra: Record<string, unknown> = {}) => ({ label, stack: true, close: true, count: 0, ...extra });

const ITEMS = {
  water: item("Water", { description: "Bottled spring water. Restores thirst." }),
  burger: item("Burger", { description: "Still warm. Mostly." }),
  sprunk: item("Sprunk", { description: "The essence of life." }),
  money: item("Money"),
  black_money: item("Dirty Money", { description: "Smells like trouble." }),
  phone: item("Phone", { stack: false, description: "iFruit 14 Pro" }),
  radio: item("Radio", { stack: false, buttons: [{ label: "Join frequency" }, { label: "Leave frequency" }] }),
  bandage: item("Bandage"),
  medikit: item("Medikit"),
  armour: item("Bulletproof Vest", { stack: false }),
  lockpick: item("Lockpick", { description: "Simple lockpick that breaks easily and can pick basic door locks." }),
  scrapmetal: item("Scrap Metal"),
  garbage: item("Garbage"),
  parachute: item("Parachute", { stack: false }),
  paperbag: item("Paper Bag", { stack: false, description: "A container for small things." }),
  card_id: item("Identification", {
    stack: false,
    buttons: [{ label: "Show ID", group: "Identification" }, { label: "Hand over", group: "Identification" }, { label: "Inspect" }],
  }),
  "ammo-9": item("9mm"),
  "ammo-rifle": item("5.56"),
  at_suppressor: item("Suppressor"),
  at_flashlight: item("Tactical Flashlight"),
  at_scope_medium: item("Medium Scope"),
  at_clip_extended: item("Extended Clip"),
  WEAPON_PISTOL: item("Pistol", { stack: false, close: true, ammoName: "ammo-9" }),
  WEAPON_CARBINERIFLE: item("Carbine Rifle", { stack: false, close: true, ammoName: "ammo-rifle" }),
  WEAPON_HAMMER: item("Hammer", { stack: false, close: true }),
};

const PLAYER_ITEMS: Slot[] = [
  {
    slot: 1,
    name: "WEAPON_PISTOL",
    count: 1,
    weight: 1130,
    metadata: { ammo: 12, durability: 82, serial: "PD4821X9", registered: "John Doe", components: ["at_suppressor", "at_flashlight"], weapontint: 3 },
  },
  { slot: 2, name: "WEAPON_CARBINERIFLE", count: 1, weight: 4500, metadata: { ammo: 0, durability: 34, serial: "RF0193KQ", components: ["at_scope_medium"] } },
  { slot: 3, name: "phone", count: 1, weight: 190 },
  { slot: 4, name: "water", count: 4, weight: 2000 },
  // degrading food: durability is an expiry timestamp, ~60% fresh
  { slot: 5, name: "burger", count: 2, weight: 440, metadata: { durability: now + Math.round(0.6 * 60 * 120), degrade: 120 } },
  { slot: 6, name: "money", count: 2450, weight: 0 },
  { slot: 7, name: "bandage", count: 6, weight: 690 },
  { slot: 8, name: "ammo-9", count: 48, weight: 480 },
  { slot: 9, name: "lockpick", count: 3, weight: 480 },
  { slot: 10, name: "paperbag", count: 1, weight: 300, metadata: { container: "bag_7731", label: "Lunch Bag" } },
  {
    slot: 11,
    name: "card_id",
    count: 1,
    weight: 10,
    metadata: { label: "ID Card", type: "Citizen", description: "**Name:** John Doe  \n**DOB:** 1992-03-14  \n**Sex:** M" },
  },
  { slot: 12, name: "black_money", count: 820, weight: 0 },
  { slot: 13, name: "scrapmetal", count: 12, weight: 960 },
  { slot: 14, name: "WEAPON_HAMMER", count: 1, weight: 1200, metadata: { durability: 47 } },
  { slot: 15, name: "radio", count: 1, weight: 500 },
  { slot: 16, name: "armour", count: 1, weight: 3000, metadata: { durability: 100 } },
  { slot: 22, name: "vape", count: 1, weight: 90 }, // not in the registry: exercises getItemData + image fallback
];

// Lua sends slot-keyed tables; a sparse one arrives as an object.
const sparse = (items: Slot[]) => Object.fromEntries(items.map((i) => [String(i.slot), i]));

const PLAYER = { id: 1, type: "player", label: "John Doe", slots: 50, maxWeight: 30000, weight: 0, groups: { police: 2 }, items: sparse(PLAYER_ITEMS) };
const GROUND = { type: "newdrop", slots: 50, weight: 0, maxWeight: 30000, items: [] };
const TRUNK = {
  id: "trunk46EEK572",
  type: "trunk",
  label: "Sultan RS · 46EEK572",
  slots: 30,
  maxWeight: 60000,
  items: [
    { slot: 1, name: "parachute", count: 1, weight: 8000 },
    { slot: 2, name: "water", count: 6, weight: 3000 },
    { slot: 3, name: "medikit", count: 2, weight: 600 },
    { slot: 5, name: "at_clip_extended", count: 1, weight: 280 },
    { slot: 6, name: "garbage", count: 9, weight: 900 },
    null,
  ],
};
const SHOP = {
  id: "General 1",
  type: "shop",
  label: "24/7 Supermarket",
  slots: 8,
  groups: { police: 0 },
  items: [
    { slot: 1, name: "burger", price: 10, weight: 220 },
    { slot: 2, name: "water", price: 8, weight: 500 },
    { slot: 3, name: "sprunk", price: 6, weight: 350, count: 40 },
    { slot: 4, name: "phone", price: 350, weight: 190 },
    { slot: 5, name: "lockpick", price: 45, currency: "black_money", weight: 160 },
    { slot: 6, name: "radio", price: 4, currency: "scrapmetal", weight: 500 },
    { slot: 7, name: "armour", price: 1200, weight: 3000, count: 0 },
    { slot: 8, name: "WEAPON_PISTOL", price: 1800, weight: 1130, grade: 3, metadata: { registered: true } },
  ],
};
const BENCH = {
  id: "debug_crafting",
  type: "crafting",
  label: "Workbench",
  index: 1,
  slots: 3,
  items: [
    { slot: 1, name: "lockpick", weight: 160, count: 2, duration: 5000, ingredients: { scrapmetal: 5, WEAPON_HAMMER: 0.05 } },
    { slot: 2, name: "medikit", weight: 300, duration: 8000, ingredients: { bandage: 3, water: 1 } },
    { slot: 3, name: "armour", weight: 3000, duration: 12000, ingredients: { scrapmetal: 20, WEAPON_HAMMER: 0 } },
  ],
};
const BAG = { id: "bag_7731", type: "container", label: "Lunch Bag", slots: 5, maxWeight: 1000, items: [{ slot: 1, name: "burger", count: 1, weight: 220 }] };
const OTHER = {
  id: 7,
  type: "otherplayer",
  label: "",
  slots: 50,
  maxWeight: 30000,
  items: [
    { slot: 1, name: "money", count: 120, weight: 0 },
    { slot: 2, name: "WEAPON_HAMMER", count: 1, weight: 1200, metadata: { durability: 12 } },
  ],
};

const counts = () => {
  const c: Record<string, number> = {};
  for (const i of PLAYER_ITEMS) if (i.name) c[i.name] = (c[i.name] ?? 0) + (i.count ?? 0);
  return c;
};

const mocks = defineMocks({
  events: {
    init: [
      {
        locale: { ui_use: "Use", ui_give: "Give", ui_close: "Close", ui_drop: "Drop", ui_added: "Added", ui_removed: "Removed", $: "$" },
        items: Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, { ...v, count: counts()[k] ?? 0 }])),
        leftInventory: { id: 1, slots: 50, maxWeight: 30000, items: sparse(PLAYER_ITEMS) },
        imagepath: IMAGES,
      },
    ],
    setupInventory: [
      { leftInventory: PLAYER, rightInventory: GROUND },
      { leftInventory: PLAYER, rightInventory: TRUNK },
      { leftInventory: PLAYER, rightInventory: SHOP },
      { leftInventory: PLAYER, rightInventory: BENCH },
      { leftInventory: PLAYER, rightInventory: BAG },
      { leftInventory: PLAYER, rightInventory: OTHER },
      { rightInventory: { id: 4211, type: "drop", label: "Drop 4211", slots: 50, maxWeight: 30000, items: [{ slot: 1, name: "garbage", count: 1, weight: 100 }] } },
    ],
    refreshSlots: [
      { items: [{ item: { slot: 4, name: "water", count: 3, weight: 1500 }, inventory: "player" }], itemCount: { water: -1 } },
      { items: { item: { slot: 20, name: "sprunk", count: 2, weight: 700 } }, itemCount: { sprunk: 2 } },
      { items: [{ item: { slot: 1 }, inventory: "trunk46EEK572" }] },
      { weightData: { inventoryId: 1, maxWeight: 45000 } },
      { slotsData: { inventoryId: "trunk46EEK572", slots: 40 } },
    ],
    closeInventory: [null],
    toggleHotbar: [null],
    itemNotify: [
      [{ slot: 4, name: "water", count: 2, weight: 1000 }, "ui_added", 2],
      [{ slot: 1, name: "WEAPON_PISTOL", metadata: {} }, "ui_equipped"],
      [{ slot: 1, name: "WEAPON_PISTOL", metadata: {} }, "ui_holstered"],
      [{ slot: 5, name: "burger", metadata: { label: "Bleeder Burger" } }, "ui_removed", 1],
    ],
    displayMetadata: [[{ metadata: "registered", value: "Registered to" }]],
    setInventoryVisible: [true, false],
  },
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mocks that behave like the server, so drag & drop, buying and crafting can be exercised. */
function installReplies() {
  browserReplies.getItemData = (name) => ({ name, label: String(name).replace(/^\w/, (c) => c.toUpperCase()), stack: true, count: 0 });
  browserReplies.swapItems = async (body: any) => {
    await wait(60);
    // set window.__oxReject = true to see a refused move roll back
    if ((window as any).__oxReject) return ((window as any).__oxReject = false);
    if (body?.toType === "container") return 980 + 220; // new bag weight
    return true;
  };
  browserReplies.buyItem = async (body: any) => {
    await wait(120);
    const s = inv.get();
    const product = s.right.items[body.fromSlot - 1];
    const target = s.left.items[body.toSlot - 1];
    if (!product?.name || (target?.name && target.name !== product.name)) return false;
    const unit = product.weight ?? 0;
    const count = (target?.count ?? 0) + body.count;
    emit("refreshSlots", {
      items: [
        { item: { slot: body.toSlot, name: product.name, count, weight: unit * count, metadata: product.metadata }, inventory: "player" },
        ...(product.count !== undefined ? [{ item: { ...product, count: product.count - body.count }, inventory: "shop" }] : []),
      ],
      itemCount: { [product.name]: body.count },
    } as never);
    return true;
  };
  browserReplies.craftItem = (body: any) => {
    const recipe = inv.get().right.items[body.fromSlot - 1];
    setTimeout(() => {
      const target = inv.get().left.items[body.toSlot - 1];
      const n = (recipe.count ?? 1) * body.count + (target?.name === recipe.name ? (target.count ?? 0) : 0);
      emit("refreshSlots", { items: [{ item: { slot: body.toSlot, name: recipe.name, count: n, weight: (recipe.weight ?? 0) * n }, inventory: "player" }] } as never);
    }, Math.min(recipe?.duration ?? 3000, 1500));
    return true;
  };
  browserReplies.useItem = (slot: any) => {
    const it = inv.get().left.items[Number(slot) - 1];
    if (it?.name) emit("itemNotify", [it, "ui_removed", 1] as never);
    return 1;
  };
  browserReplies.exit = () => {
    setTimeout(() => emit("closeInventory", null as never), 0);
    return 1;
  };
}

export default function Dev() {
  useEffect(() => {
    installReplies();
    // for scripted browser tests
    (window as any).__oxFixtures = { PLAYER, GROUND, TRUNK, SHOP, BENCH, BAG, OTHER, mocks: mocks.events };
    // Lua sends init after uiLoaded, then the player opens the inventory
    const init = mocks.events!.init![0];
    emit("init", init as never);
    emit("displayMetadata", [{ metadata: "registered", value: "Registered to" }] as never);
    const params = new URLSearchParams(location.search);
    if (params.has("closed")) return;
    emit("setupInventory", { leftInventory: PLAYER, rightInventory: GROUND } as never);
  }, []);
  return <NuiDevtools events={mocks.events as never} scene="day" />;
}
