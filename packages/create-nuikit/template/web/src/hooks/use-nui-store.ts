"use client"

import * as React from "react"
import { useNuiEvent, type EventData, type EventName } from "nuikit-core/react"

/**
 * useNuiStore — keep one object in sync with partial updates from Lua.
 * Lua can send only what changed: NUI.send('hud:player', { armor = 40 })
 *
 *   const player = useNuiStore("hud:player", { health: 100, armor: 0, hunger: 100 })
 */
function useNuiStore<K extends EventName>(event: K, initial: EventData<K> & object) {
  const [state, setState] = React.useState(initial)
  useNuiEvent(event, (patch) => setState((s) => ({ ...s, ...(patch as object) })))
  return state
}

export { useNuiStore }
