// @vitest-environment jsdom
// nk.settings, page side (src/settings.ts): the same rules as the Lua store, and the browser stand-in.
import { describe, expect, it } from "vitest";
import { applySettingsPreset, cancelSettings, draftSettings, loadSettings, mergeSettings, mockSettings, normalizeSetting, resetSettings, saveSettings, type SettingRow } from "../src/settings";

const rows: SettingRow[] = [
  { key: "layout", label: "Layout", options: [{ value: "compact" }, { value: "classic" }], default: "compact" },
  { key: "scale", label: "Size", range: [0.8, 1.2, 0.05], default: 1 },
  { key: "minimap", label: "Minimap", toggle: true, default: true },
];

describe("settings rules", () => {
  it("normalize: options listed, ranges clamp and snap, toggles boolean", () => {
    expect(normalizeSetting(rows[0]!, "classic")).toBe("classic");
    expect(normalizeSetting(rows[0]!, "huge")).toBeUndefined();
    expect(normalizeSetting(rows[1]!, 1.13)).toBe(1.15);
    expect(normalizeSetting(rows[1]!, 9)).toBe(1.2);
    expect(normalizeSetting(rows[2]!, "yes")).toBeUndefined();
  });
  it("merge: defaults, then saved, then draft", () => {
    expect(mergeSettings(rows, { layout: "classic", gone: 1 }, { scale: 0.85 })).toEqual({ layout: "classic", scale: 0.85, minimap: true });
  });
});

describe("browser stand-in", () => {
  it("drafts, saves, presets, cancels and resets like the store", async () => {
    mockSettings([{ resource: "hud", label: "HUD", version: 1, rows, presets: [{ id: "streamer", label: "Streamer", patch: { minimap: false } }] }]);
    expect((await loadSettings("hud"))[0]!.values).toEqual({ layout: "compact", scale: 1, minimap: true });
    expect(await draftSettings("hud", { layout: "classic" })).toMatchObject({ layout: "classic" });
    expect((await loadSettings())[0]!.draft).toBe(true);
    expect(await cancelSettings("hud")).toMatchObject({ layout: "compact" });
    await draftSettings("hud", { layout: "classic" });
    await saveSettings("hud");
    expect(await applySettingsPreset("hud", "streamer")).toMatchObject({ layout: "classic", minimap: false });
    await cancelSettings("hud");
    expect(await resetSettings("hud")).toEqual({ layout: "compact", scale: 1, minimap: true });
  });
});
