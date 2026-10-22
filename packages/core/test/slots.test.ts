// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getSlots, setSlots } from "../src/slots";

describe("slots, page side", () => {
  it("orders a cluster's slots by order, then resource, then key; hides hidden ones; [] is none", () => {
    setSlots({
      vitals: {
        "radio:signal": { key: "signal", resource: "radio", order: 60 },
        "voice:talk": { key: "talk", resource: "voice", order: 50 },
        "job:duty": { key: "duty", resource: "job", order: 60 },
        "job:secret": { key: "secret", resource: "job", order: 1, hidden: true },
      },
    });
    expect(getSlots("vitals").map((s) => `${s.resource}:${s.key}`)).toEqual(["voice:talk", "job:duty", "radio:signal"]);
    expect(getSlots("vitals")).toBe(getSlots("vitals"));
    expect(getSlots("nope")).toEqual([]);
    setSlots([]);
    expect(getSlots("vitals")).toEqual([]);
  });
});
