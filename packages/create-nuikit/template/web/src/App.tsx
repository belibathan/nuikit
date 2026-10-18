import { fetchNui, useNuiVisibility } from "nuikit-core/react";
import { HeartPulseIcon, ShieldIcon, SparklesIcon, SyringeIcon } from "lucide-react";
import { useState } from "react";
import { KeyHint } from "@/components/ui/key-hint";
import { NuiMenu, type NuiMenuItem } from "@/components/ui/nui-menu";
import { NuiToaster } from "@/components/ui/nui-toaster";
import { Vital } from "@/components/ui/vital";
import { useNuiStore } from "@/hooks/use-nui-store";

const items: NuiMenuItem[] = [
  { id: "heal", label: "Heal", description: "Restore full health", icon: <HeartPulseIcon />, meta: "$250" },
  { id: "armor", label: "Body armor", description: "Equip a fresh vest", icon: <ShieldIcon />, meta: "$500" },
  { id: "hurt", label: "Test damage", description: "Lose 40 health", icon: <SyringeIcon /> },
  { id: "vip", label: "VIP lounge", description: "Members only", icon: <SparklesIcon />, disabled: true },
];

export default function App() {
  const vitals = useNuiStore("hud:vitals", { health: 100, armor: 0 });
  const { visible } = useNuiVisibility(); // driven by NUI.open() / NUI.close(); Escape closes
  const [busy, setBusy] = useState(false);

  async function select(item: NuiMenuItem) {
    setBusy(true);
    try {
      await fetchNui("menu:select", { id: item.id }); // typed by src/nui.d.ts
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* HUD: always on */}
      <div className="absolute bottom-12 left-12 flex flex-col gap-2">
        <Vital label="Health" value={vitals.health} tone="destructive" icon={<HeartPulseIcon />} />
        <Vital label="Armor" value={vitals.armor} icon={<ShieldIcon />} low={-1} />
      </div>

      {!visible && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <KeyHint keys="F7">Open menu</KeyHint>
        </div>
      )}

      {/* Menu: only while Lua has it open */}
      {visible && (
        <div className="absolute top-1/2 right-24 -translate-y-1/2">
          <NuiMenu title="Menu" description="↑↓ to move · Enter to select · Esc to close" items={items} onSelect={select} aria-busy={busy} />
        </div>
      )}

      <NuiToaster />
    </main>
  );
}
