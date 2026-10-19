import { createStore } from "@/lib/store";

/** English fallbacks for every key ox_inventory's UI uses (§9). */
const EN: Record<string, string> = {
  ui_use: "Use",
  ui_give: "Give",
  ui_close: "Close",
  ui_drop: "Drop",
  ui_removeattachments: "Remove attachments",
  ui_copy: "Copy serial number",
  ui_durability: "Durability",
  ui_ammo: "Ammo",
  ui_serial: "Serial number",
  ui_components: "Components",
  ui_tint: "Tint",
  ui_usefulcontrols: "Useful controls",
  ui_rmb: "Open item context menu",
  ui_ctrl_lmb: "Fast move a stack of items into another inventory",
  ui_shift_drag: "Split item quantity into half",
  ui_ctrl_shift_lmb: "Fast move half a stack of items into another inventory",
  ui_alt_lmb: "Fast use an item",
  ui_ctrl_c: "When hovering over a weapon, copies its serial number",
  ui_remove_ammo: "Remove ammo",
  ui_removed: "Removed",
  ui_added: "Added",
  ui_holstered: "Holstered",
  ui_equipped: "Equipped",
  ammo_type: "Ammo type",
  $: "$",
};

export const localeStore = createStore<{ strings: Record<string, string> }>({ strings: {} });

export function setLocale(strings: Record<string, string> | undefined) {
  localeStore.set({ strings: { ...localeStore.get().strings, ...(strings ?? {}) } });
}

/** Translate outside React (reads the current locale). */
export function t(key: string): string {
  return localeStore.get().strings[key] ?? EN[key] ?? key;
}

/** Re-renders when the locale arrives. */
export function useT() {
  localeStore.use((s) => s.strings);
  return t;
}
