// Every state of the settings panel, as your Lua would send it. Used by dev.tsx (browser
// development, ?fixture=<name>&tab=<section>), screenshots and the site's previews.
import type { SettingsData, SettingsSection } from "./nui"

const iface: SettingsSection = {
  id: "interface",
  title: "Interface",
  items: [
    { id: "hud", type: "toggle", label: "Show the HUD", description: "Vitals, money and the speedometer", value: true },
    {
      id: "units",
      type: "choice",
      label: "Speed",
      options: [
        { value: "mph", label: "mph" },
        { value: "kmh", label: "km/h" },
      ],
      value: "mph",
    },
    {
      id: "minimap",
      type: "choice",
      label: "Minimap",
      description: "When the radar shows",
      options: [
        { value: "always", label: "Always" },
        { value: "vehicle", label: "In vehicles" },
        { value: "never", label: "Never" },
      ],
      value: "vehicle",
    },
    { id: "streamer", type: "toggle", label: "Streamer mode", description: "Hide names and phone numbers", value: false },
  ],
}

// nuikit's own player preferences: every nuikit UI follows them (nk.prefs in Lua)
const access: SettingsSection = {
  id: "accessibility",
  title: "Accessibility",
  items: [
    { id: "scale", type: "slider", label: "UI size", description: "Every nuikit screen", min: 85, max: 125, step: 5, value: 100, unit: "%" },
    { id: "reducedMotion", type: "toggle", label: "Reduce motion", description: "No animations or transitions", value: false },
    { id: "highContrast", type: "toggle", label: "High contrast", description: "Stronger text and borders", value: false },
  ],
}

const keys: SettingsSection = {
  id: "keys",
  title: "Keys",
  items: [
    { id: "key-settings", type: "key", label: "Open settings", description: "Change any key in Settings → Key Bindings → FiveM", key: "F10" },
    { id: "key-radial", type: "key", label: "Radial menu", key: "Z" },
    { id: "key-phone", type: "key", label: "Phone", key: "M" },
    { id: "key-inventory", type: "key", label: "Inventory", key: "Tab" },
  ],
}

export const settingsFixtures = {
  full: { sections: [iface, access, keys], resettable: true },
  // one section: no tabs
  single: { title: "Accessibility", description: "Applies to every nuikit screen", sections: [access] },
  disabled: {
    sections: [{ ...iface, items: iface.items.map((i) => (i.id === "minimap" ? { ...i, disabled: true, description: "Set by the server" } : i)) }, access],
  },
  empty: { sections: [] },
} satisfies Record<string, SettingsData>

export type SettingsFixture = keyof typeof settingsFixtures
