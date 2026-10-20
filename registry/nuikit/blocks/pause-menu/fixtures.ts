// Every state of the pause menu, as your Lua (the menu) and nuikit's bridge (the player) would send
// it. Used by dev.tsx (browser development, ?fixture=<name>), screenshots and the site's previews.
import type { NuiPlayer } from "nuikit-core"

import type { PauseMenuData } from "./nui"

const menu: PauseMenuData = {
  server: { name: "Los Santos", tagline: "Roleplay", logo: "LS" },
  actions: ["resume", "map", "settings", "keybinds", "disconnect"],
  links: [
    { label: "Discord", value: "discord.gg/yourserver" },
    { label: "Website", value: "yourserver.com" },
  ],
  serverId: 7,
  playerName: "alex_m",
  players: 42,
  maxPlayers: 128,
  ping: 38,
  uptime: 3 * 3600 + 12 * 60,
}

const player: NuiPlayer = {
  loaded: true,
  name: "Alex Mercer",
  health: 86,
  armor: 40,
  cash: 1520,
  bank: 48210,
  job: { name: "police", label: "LSPD", grade: 3, gradeLabel: "Sergeant", onDuty: true },
  dead: false,
  voice: { talking: false },
}

export const pauseMenuFixtures = {
  // the server has answered: players, ping and uptime
  full: { data: menu, player },
  // just opened: the server's answer hasn't arrived yet
  opening: { data: { ...menu, players: undefined, maxPlayers: undefined, ping: undefined, uptime: undefined }, player },
  // no character loaded (character select, standalone without a framework)
  "no-character": {
    data: { ...menu, server: { name: "" }, links: [] },
    player: { loaded: false, health: 100, armor: 0, dead: false, voice: { talking: false } },
  },
  // a server that only offers resume and disconnect
  minimal: { data: { ...menu, actions: ["resume", "disconnect"], links: [] }, player: { ...player, job: undefined } },
} satisfies Record<string, { data: PauseMenuData; player: NuiPlayer }>

export type PauseMenuFixture = keyof typeof pauseMenuFixtures
