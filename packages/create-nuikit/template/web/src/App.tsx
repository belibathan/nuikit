import { fetchNui, Surface, useSurface } from "nuikit-core/react";
import { HeartPulseIcon, ShieldIcon, SparklesIcon, SyringeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyHint } from "@/components/ui/key-hint";
import { NuiMenu, type NuiMenuItem } from "@/components/ui/nui-menu";
import { NuiToaster } from "@/components/ui/nui-toaster";
import { Vital } from "@/components/ui/vital";
import { useNuiStore } from "@/hooks/use-nui-store";

const items: NuiMenuItem[] = [
  { id: "heal", label: "Heal", description: "Restore full health", icon: <HeartPulseIcon />, meta: "$250" },
  { id: "armor", label: "Body armor", description: "Asks to confirm first", icon: <ShieldIcon />, meta: "$500" },
  { id: "hurt", label: "Test damage", description: "Lose 40 health", icon: <SyringeIcon /> },
  { id: "vip", label: "VIP lounge", description: "Members only", icon: <SparklesIcon />, disabled: true },
];

// Three surfaces, declared in client/main.lua: a HUD (no input), a menu (panel) and a
// confirm dialog (modal). nuikit decides which one has focus; Escape closes top-down.
export default function App() {
  const vitals = useNuiStore("hud:vitals", { health: 100, armor: 0 });
  const menu = useSurface("menu");

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Surface name="hud" layer="hud">
        <div className="absolute bottom-12 left-12 flex flex-col gap-2">
          <Vital label="Health" value={vitals.health} tone="destructive" icon={<HeartPulseIcon />} />
          <Vital label="Armor" value={vitals.armor} icon={<ShieldIcon />} low={-1} />
        </div>
        {!menu.open && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            <KeyHint keys="F7">Open menu</KeyHint>
          </div>
        )}
      </Surface>

      <Surface name="menu" layer="panel" exclusive blockedBy={["dead"]}>
        <div className="absolute top-1/2 right-24 -translate-y-1/2">
          <NuiMenu
            title="Menu"
            description="↑↓ to move · Enter to select · Esc to close"
            items={items}
            global={menu.focused} // keys go to whichever surface has focus
            onSelect={(item) => fetchNui("menu:select", { id: item.id })} // typed by src/nui.d.ts
          />
        </div>
      </Surface>

      <Surface name="confirm" layer="modal">
        {(data) => (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <Card className="w-80">
              <CardHeader>
                <CardTitle>{data.title}</CardTitle>
                <CardDescription>${data.price.toLocaleString()} · Esc to go back</CardDescription>
              </CardHeader>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => fetchNui("confirm:answer", { id: data.id, yes: false })}>
                  Cancel
                </Button>
                <Button autoFocus onClick={() => fetchNui("confirm:answer", { id: data.id, yes: true })}>
                  Buy
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </Surface>

      <NuiToaster />
    </main>
  );
}
