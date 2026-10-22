// @vitest-environment jsdom
// nk.keys, page side (src/keys.ts): the browser stand-in.
import { describe, expect, it } from "vitest";
import { loadKeys, mockKeys } from "../src/keys";

describe("keys browser stand-in", () => {
  it("lists what mockKeys was given, binding and mapper defaulted", async () => {
    mockKeys([{ resource: "hud", id: "edit", label: "Edit the HUD", default: "F7" }, { resource: "hud", id: "map", label: "Map", default: "M", binding: "N", mapper: "keyboard" }]);
    expect(await loadKeys()).toEqual([
      { resource: "hud", id: "edit", label: "Edit the HUD", default: "F7", binding: "F7", mapper: "keyboard" },
      { resource: "hud", id: "map", label: "Map", default: "M", binding: "N", mapper: "keyboard" },
    ]);
  });
});
