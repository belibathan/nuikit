import { fetchNui, Surface, useSurface } from "nuikit-core/react";
import { HeartPulseIcon, ShieldIcon, SparklesIcon, SyringeIcon, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HudChip } from "@/components/ui/hud-chip";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { NuiToaster } from "@/components/ui/nui-toaster";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { useNuiStore } from "@/hooks/use-nui-store";

type Action = { id: string; label: string; description: string; icon: LucideIcon; meta?: string; disabled?: boolean };

const actions: Action[] = [
  { id: "heal", label: "Heal", description: "Restore full health", icon: HeartPulseIcon, meta: "$250" },
  { id: "armor", label: "Body armor", description: "Asks to confirm first", icon: ShieldIcon, meta: "$500" },
  { id: "hurt", label: "Test damage", description: "Lose 40 health", icon: SyringeIcon },
  { id: "vip", label: "VIP lounge", description: "Members only", icon: SparklesIcon, disabled: true },
];

// Three surfaces, declared in client/main.lua: a HUD (no input), a menu (panel) and a confirm
// dialog (modal). nuikit decides which one has focus; Escape closes top-down. Everything is built
// from the kit (docs/design.md): Panel, MenuRow, Meter, HudChip. Colours come from the theme.
export default function App() {
  const vitals = useNuiStore("hud:vitals", { health: 100, armor: 0 });
  const menu = useSurface("menu");

  return (
    <main className="nk-edge fixed inset-0 overflow-hidden">
      <Surface name="hud" layer="hud">
        <div className="nk-anchor-bl flex w-40 flex-col gap-2">
          <Meter aria-label="Health" icon={<HeartPulseIcon />} value={vitals.health} low={20} tone="destructive" track="game" size="sm" />
          <Meter aria-label="Armor" icon={<ShieldIcon />} value={vitals.armor} track="game" size="sm" />
        </div>
        {!menu.open && (
          <div className="nk-anchor-b">
            <HudChip icon={<Kbd className="h-4 min-w-4 bg-white/20 text-white">F7</Kbd>}>Open menu</HudChip>
          </div>
        )}
      </Surface>

      <Surface name="menu" layer="panel" exclusive blockedBy={["dead"]}>
        <div className="nk-anchor-r">
          <Menu keys={menu.focused} />
        </div>
      </Surface>

      <Surface name="confirm" layer="modal">
        {(data) => (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <Panel size="sm">
              <PanelHeader title={data.title} />
              <PanelBody variant="form">
                <p className="text-sm text-muted-foreground">
                  It costs <span className="nk-num font-medium text-foreground">${data.price.toLocaleString()}</span>. Press Esc to go back.
                </p>
              </PanelBody>
              <PanelFooter className="justify-end">
                <Button variant="outline" size="sm" onClick={() => fetchNui("confirm:answer", { id: data.id, yes: false })}>
                  Cancel
                </Button>
                <Button size="sm" autoFocus onClick={() => fetchNui("confirm:answer", { id: data.id, yes: true })}>
                  Buy
                </Button>
              </PanelFooter>
            </Panel>
          </div>
        )}
      </Surface>

      <NuiToaster />
    </main>
  );
}

/** The menu panel: arrows or W/S move, Enter or E picks. `keys` is false while a modal is on top. */
function Menu({ keys }: { keys: boolean }) {
  const [active, setActive] = useState(0);
  const select = (a: Action) => !a.disabled && fetchNui("menu:select", { id: a.id }); // typed by src/nui.d.ts

  useEffect(() => {
    if (!keys) return;
    const move = (dir: 1 | -1) =>
      setActive((i) => {
        for (let step = 1; step <= actions.length; step++) {
          const next = (i + dir * step + actions.length) % actions.length;
          if (!actions[next]!.disabled) return next;
        }
        return i;
      });
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "s") (e.preventDefault(), move(1));
      else if (k === "arrowup" || k === "w") (e.preventDefault(), move(-1));
      else if (k === "enter" || k === "e") (e.preventDefault(), void select(actions[active]!));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys, active]);

  return (
    <Panel>
      <PanelHeader title="Menu" description="Pick an action" />
      <PanelBody>
        {actions.map((a, i) => (
          <MenuRow
            key={a.id}
            icon={<a.icon />}
            description={a.description}
            meta={a.meta}
            disabled={a.disabled}
            active={i === active}
            onMouseEnter={() => !a.disabled && setActive(i)}
            onClick={() => void select(a)}
          >
            {a.label}
          </MenuRow>
        ))}
      </PanelBody>
      <PanelFooter className="nk-label">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        Move
        <Kbd className="ml-2">Enter</Kbd>
        Select
        <Kbd className="ml-auto">Esc</Kbd>
        Close
      </PanelFooter>
    </Panel>
  );
}
