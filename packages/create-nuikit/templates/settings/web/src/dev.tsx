// The game, faked for browser development. Press ` for the devtools: open the panel (Surfaces
// tab), watch what each change sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see settingsFixtures).
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { settingsFixtures, type SettingsFixture } from "@/components/blocks/settings/fixtures";

const f = settingsFixtures;

// Play client/main.lua's part: accept the change (UI size is clamped to 85–125) and log what it got.
const mocks = defineMocks({
  callbacks: {
    "settings:change": (req) => {
      console.info("[nui] settings:change", JSON.stringify(req));
      const value = req.id === "scale" ? Math.max(85, Math.min(125, Number(req.value))) : req.value;
      return { ok: true, value };
    },
    "settings:reset": () => {
      console.info("[nui] settings:reset");
      return { ok: true, sections: f.full.sections };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "full") as SettingsFixture;
    // client/main.lua opens it with F10 or /<resource>
    void openSurface("settings", f[name] ?? f.full);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ settings: f.full }} scene="dusk" />;
}
