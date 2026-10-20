// What the server hands the loading screen while the player connects. A loading screen runs before
// any resource starts on the client, so it can't receive NUI messages: the server puts everything
// in deferrals.handover({ nuikit = { … } }) and the game injects it as window.nuiHandoverData
// before the page runs (server/main.lua in the template).
import { useSyncExternalStore } from "react"
import type { CompiledTheme } from "nuikit-core"

export type LoadingTip = string | { title?: string; text: string }

export interface LoadingLink {
  label: string
  /** Shown as text: the game can't open a browser. */
  url?: string
}

export interface LoadingHandover {
  /** The compiled server theme (the nuikit resource's GlobalState.nuikitTheme), or raw theme.css. */
  theme?: string | CompiledTheme | null
  serverName?: string
  tagline?: string
  /** The connecting player's FiveM name. */
  playerName?: string
  /** nui:// or https:// URL. */
  logo?: string | null
  tips?: LoadingTip[]
  /** ms between tips (at least 3000). */
  tipInterval?: number
  /** nui:// or https:// URLs, cross-faded. None: the theme's own backdrop. */
  backgrounds?: string[]
  backgroundInterval?: number
  music?: string[]
  /** 0–1 */
  musicVolume?: number
  links?: LoadingLink[]
}

declare global {
  interface Window {
    /** Merged deferrals.handover() data of every resource, injected by the game before the page runs. */
    nuiHandoverData?: { nuikit?: LoadingHandover } & Record<string, unknown>
  }
}

// Lua turns an empty table into {} instead of [], so lists are normalised here.
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === "object" ? (Object.values(v) as T[]) : [])

function read(): LoadingHandover {
  const raw = (typeof window !== "undefined" && window.nuiHandoverData?.nuikit) || {}
  return {
    ...raw,
    tips: list<LoadingTip>(raw.tips),
    backgrounds: list<string>(raw.backgrounds),
    music: list<string>(raw.music),
    links: list<LoadingLink>(raw.links),
  }
}

let current = read()
const listeners = new Set<() => void>()

/** Browser development only: replace the handover (in game it is set once, before the page runs). */
function setHandover(data: LoadingHandover | undefined) {
  window.nuiHandoverData = { ...window.nuiHandoverData, nuikit: data }
  current = read()
  listeners.forEach((l) => l())
}

function useHandover(): LoadingHandover {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current
  )
}

export { setHandover, useHandover }
