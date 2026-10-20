// The contract between your Lua and the settings panel. Lua opens the `settings` surface with a
// SettingsData snapshot (sections of items, each with its current value); every change the player
// makes comes back through `settings:change`, and whatever Lua answers is what the row shows.
import "nuikit-core"

interface SettingsItemBase {
  /** Unique across all sections: what `settings:change` sends back. */
  id: string
  label: string
  description?: string
  disabled?: boolean
}

/** On / off. */
export interface SettingsToggle extends SettingsItemBase {
  type: "toggle"
  value: boolean
}

/** One of a few options, stepped with ‹ › (or Left / Right). */
export interface SettingsChoice extends SettingsItemBase {
  type: "choice"
  options: { value: string; label: string }[]
  value: string
}

/** A number on a slider. */
export interface SettingsSlider extends SettingsItemBase {
  type: "slider"
  min: number
  max: number
  step?: number
  value: number
  /** How the value reads: "%" → "85%", " m" → "3 m". */
  unit?: string
}

/** A key hint, read only: what the key does and where to change it. */
export interface SettingsKey extends SettingsItemBase {
  type: "key"
  key: string
}

export type SettingsItem = SettingsToggle | SettingsChoice | SettingsSlider | SettingsKey
export type SettingsValue = boolean | string | number

export interface SettingsSection {
  id: string
  title: string
  items: SettingsItem[]
}

export interface SettingsData {
  title?: string
  description?: string
  sections: SettingsSection[]
  /** Show a "Reset to defaults" button (answers through `settings:reset`). */
  resettable?: boolean
}

declare module "nuikit-core" {
  interface NuiSurfaces {
    settings: SettingsData
  }
  interface NuiCallbacks {
    /** The player changed a setting. Answer with the value it now has (Lua may clamp or refuse it). */
    "settings:change": { req: { id: string; value: SettingsValue }; res: { ok: boolean; value?: SettingsValue } }
    /** Reset everything; answer with the sections as they now are. */
    "settings:reset": { req: void; res: { ok: boolean; sections?: SettingsSection[] } }
  }
}
