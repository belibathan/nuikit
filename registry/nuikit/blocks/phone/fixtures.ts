// Every state of the phone, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { PhoneData } from "./nui"

// Fixed times so stills don't change: 2026-10-22, in the evening, UTC.
const t = (h: number, m: number) => Date.UTC(2026, 9, 22, h, m) / 1000

const full: PhoneData = {
  number: "5550142",
  signal: 4,
  limits: { name: 24, text: 240 },
  contacts: [
    { name: "Ana Reyes", number: "5550188" },
    { name: "Bay Auto", number: "5550123" },
    { name: "Marcus", number: "5550177" },
  ],
  threads: [
    {
      number: "5550188",
      messages: [
        { from: "them", text: "Are we still on for tonight?", time: t(18, 2) },
        { from: "me", text: "Yes, the usual place at nine.", time: t(18, 5) },
        { from: "them", text: "Perfect. I'll bring the keys.", time: t(18, 6) },
      ],
    },
    { number: "5550123", messages: [{ from: "them", text: "Your car is ready for pickup.", time: t(15, 40) }] },
  ],
}

export const phoneFixtures = {
  full,
  /** A new player: a number and nothing else. */
  empty: { number: "5550199", contacts: [], threads: [] },
  /** One bar of signal. */
  weak: { ...full, signal: 1 },
} satisfies Record<string, PhoneData>

export type PhoneFixture = keyof typeof phoneFixtures
