// Every state of the death screen, as your Lua would send it. Used by dev.tsx (browser
// development, ?fixture=<name>), screenshots and the site's previews.
import type { DeathScreenData } from "./nui"

const downText = { title: "You are down", subtitle: "Stay with us. Help may be on the way." }
const deadText = { title: "You are unconscious", subtitle: "Wait for EMS, or respawn when the timer ends." }

export const deathScreenFixtures = {
  down: { phase: "down", seconds: 182, total: 300, helpable: true, ...downText },
  "down-ems": { phase: "down", seconds: 147, total: 300, ems: { key: "G", state: "available" }, ...downText },
  "down-urgent": { phase: "down", seconds: 24, total: 300, ems: { key: "G", state: "requested" }, ...downText },
  dead: {
    phase: "dead", seconds: 247, total: 300,
    respawn: { key: "E", available: false, cost: 2000 }, ems: { key: "G", state: "cooldown", seconds: 38 }, ...deadText,
  },
  "dead-respawn": {
    phase: "dead", seconds: 0, total: 300,
    respawn: { key: "E", available: true, cost: 2000 }, ems: { key: "G", state: "available" }, ...deadText,
  },
  "dead-untimed": { phase: "dead", respawn: { key: "E", available: false, wait: 43 }, ...deadText, subtitle: undefined },
} satisfies Record<string, DeathScreenData>

export type DeathScreenFixture = keyof typeof deathScreenFixtures
