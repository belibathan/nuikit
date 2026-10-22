// The contract between your Lua and the phone. Lua opens the `phone` surface with a PhoneData
// snapshot (the player's own number, their contacts, their message threads); the page asks Lua to
// add a contact or send a text, and Lua answers. The server owns all of it: the number is assigned
// there, contacts and messages live there, and a text's sender and time are stamped there. The page
// never says who it is. After every change, and when a text arrives, Lua sends a fresh snapshot
// (surface:update). Numbers are digits only ("5551234"); the page draws them as 555-1234.
import "nuikit-core"

export interface PhoneContact {
  name: string
  number: string
}

export interface PhoneMessage {
  /** "me" sent it, "them" received it. */
  from: "me" | "them"
  text: string
  /** Unix seconds, stamped by the server. */
  time: number
}

export interface PhoneThread {
  /** The other end. */
  number: string
  /** Oldest first. */
  messages: PhoneMessage[]
}

export interface PhoneData {
  /** The player's own number, assigned by the server. */
  number: string
  contacts: PhoneContact[]
  threads: PhoneThread[]
  /** 0–4 bars. Omit for full. */
  signal?: number
  /** The server's limits, so the page can say so before asking (default 24 and 240). */
  limits?: { name: number; text: number }
}

export type PhoneAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    phone: PhoneData
  }
  interface NuiCallbacks {
    "phone:addContact": { req: { name: string; number: string }; res: PhoneAnswer }
    "phone:send": { req: { to: string; text: string }; res: PhoneAnswer }
  }
}
