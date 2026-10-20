import { describe, expect, it } from "vitest"

import { holdProgress, keyPromptPosition, parseKeyText } from "@/components/ui/key-prompt"

describe("key-prompt", () => {
  it("turns a hold's elapsed time into 0–1", () => {
    expect(holdProgress(0, 1500)).toBe(0)
    expect(holdProgress(750, 1500)).toBe(0.5)
    expect(holdProgress(2000, 1500)).toBe(1)
    expect(holdProgress(-10, 1500)).toBe(0)
    expect(holdProgress(0.3, 1)).toBe(0.3)
    // no duration: done as soon as it starts
    expect(holdProgress(0, 0)).toBe(0)
    expect(holdProgress(1, 0)).toBe(1)
  })

  it("splits a script's text into keys and a label", () => {
    expect(parseKeyText("[E] - Open garage")).toEqual({ keys: ["E"], label: "Open garage" })
    expect(parseKeyText("**[E]** Pick up")).toEqual({ keys: ["E"], label: "Pick up" })
    expect(parseKeyText("[Shift] + [E] Lock vehicle")).toEqual({ keys: ["Shift", "E"], label: "Lock vehicle" })
    expect(parseKeyText("[G]: Rob register")).toEqual({ keys: ["G"], label: "Rob register" })
    expect(parseKeyText("Press E to talk")).toEqual({ keys: [], label: "Press E to talk" })
    // a key with nothing after it stays text
    expect(parseKeyText("[E]")).toEqual({ keys: [], label: "[E]" })
  })

  it("maps other libraries' positions", () => {
    expect(keyPromptPosition("right-center")).toBe("center-right")
    expect(keyPromptPosition("left-center")).toBe("center-left")
    expect(keyPromptPosition("left")).toBe("center-left")
    expect(keyPromptPosition("top")).toBe("top-center")
    expect(keyPromptPosition("bottom-center")).toBe("bottom-center")
    expect(keyPromptPosition("nowhere")).toBe("center-right")
    expect(keyPromptPosition(undefined)).toBe("center-right")
  })
})
