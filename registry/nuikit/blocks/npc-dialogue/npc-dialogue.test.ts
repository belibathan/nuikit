import { describe, expect, it } from "vitest"

import { dialogueChoiceAt, dialogueMove, dialogueRevealed } from "./npc-dialogue"
import type { DialogueChoice } from "./nui"

const choices: DialogueChoice[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B", locked: true, lockedReason: "Police only" },
  { id: "c", label: "C" },
]

describe("npc dialogue", () => {
  it("picks a choice by number key, never a locked or missing one", () => {
    expect(dialogueChoiceAt(choices, "1")).toBe("a")
    expect(dialogueChoiceAt(choices, "3")).toBe("c")
    expect(dialogueChoiceAt(choices, "2")).toBeNull()
    expect(dialogueChoiceAt(choices, "4")).toBeNull()
    expect(dialogueChoiceAt(choices, "x")).toBeNull()
  })

  it("moves between available choices, skipping locked ones, and stops at the ends", () => {
    expect(dialogueMove(choices, 0, 1)).toBe(2)
    expect(dialogueMove(choices, 2, -1)).toBe(0)
    expect(dialogueMove(choices, 2, 1)).toBe(2)
    expect(dialogueMove(choices, 0, -1)).toBe(0)
    expect(dialogueMove([{ id: "x", label: "X", locked: true }], 0, 1)).toBe(0)
  })

  it("reveals the line a character at a time, all of it when motion is off", () => {
    expect(dialogueRevealed("Hello", 0, true)).toBe("")
    expect(dialogueRevealed("Hello", 2, true)).toBe("He")
    expect(dialogueRevealed("Hello", 99, true)).toBe("Hello")
    expect(dialogueRevealed("Hello", 0, false)).toBe("Hello")
  })
})
