import {
  CarIcon,
  CircleCheckIcon,
  DropletIcon,
  FlameIcon,
  HeartPulseIcon,
  InfoIcon,
  LandmarkIcon,
  MicIcon,
  RadioIcon,
  ShieldIcon,
  TriangleAlertIcon,
  UtensilsIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

/**
 * One game screen at 1080p made only of the kit, touching every token a theme sets: the HUD (vitals,
 * chips, money on the game), a panel (rows, highlight, destructive, primary and outline buttons),
 * and the status colours. Lay it inside a GameStage.
 */
export function ThemePreview() {
  return (
    <div className="nk-edge absolute inset-0">
      <div className="nk-anchor-tr flex flex-col items-end gap-2">
        <Stat surface="game" align="end" icon={<WalletIcon />} label="Cash" value="$1,520" />
        <Stat surface="game" align="end" size="sm" icon={<LandmarkIcon />} label="Bank" value="$48,210" />
      </div>

      <div className="nk-anchor-tl flex w-80 flex-col gap-2">
        <Status tone="success" icon={<CircleCheckIcon />} title="Paid" text="+$500 from the dealer" />
        <Status tone="warning" icon={<TriangleAlertIcon />} title="Low fuel" text="12% left in the tank" />
        <Status tone="destructive" icon={<WrenchIcon />} title="Engine damaged" text="Find a mechanic soon" />
        <Status tone="info" icon={<InfoIcon />} title="Tip" text="Hold Z for the radial menu" />
      </div>

      <div className="nk-anchor-bl flex flex-col gap-3">
        <div className="nk-shadow flex w-40 flex-col gap-2">
          <Meter aria-label="Health" icon={<HeartPulseIcon />} value={72} low={20} tone="health" track="game" size="sm" />
          <Meter aria-label="Armor" icon={<ShieldIcon />} value={40} tone="armor" track="game" size="sm" />
          <Meter aria-label="Hunger" icon={<UtensilsIcon />} value={64} low={20} tone="hunger" track="game" size="sm" />
          <Meter aria-label="Thirst" icon={<DropletIcon />} value={14} low={20} tone="thirst" track="game" size="sm" />
          <Meter aria-label="Stress" icon={<FlameIcon />} value={36} high={80} tone="stress" track="game" size="sm" />
        </div>
        <div className="flex gap-2">
          <Chip material="hud" icon={<MicIcon />} active>
            Normal
          </Chip>
          <Chip material="hud" icon={<RadioIcon />}>101 MHz</Chip>
        </div>
      </div>

      {/* the display face, case and tracking of the identity; a slab prompt (key tokens, chip plate) */}
      <div className="nk-anchor-t nk-on-game flex flex-col items-center gap-2 text-center">
        <p className="nk-display">Legion Square</p>
        <div className="nk-slab">
          <kbd className="nk-slab-key">E</kbd>Open the garage
        </div>
      </div>

      <div className="nk-anchor-b flex gap-2">
        <Chip material="hud" icon={<Kbd className="h-4 min-w-4 bg-hud-foreground/20 text-hud-foreground">E</Kbd>}>Open garage</Chip>
        <Chip material="hud" icon={<TriangleAlertIcon />} state="warning">
          Seatbelt
        </Chip>
      </div>

      <div className="nk-anchor-r">
        <Panel>
          <PanelHeader icon={<CarIcon />} title="Garage" description="Legion Square, 4 of 6 spaces" />
          <PanelBody>
            <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01">
              Pegassi Zentorno
            </MenuRow>
            <MenuRow icon={<CarIcon />} description="Out, last seen in Vinewood" meta="BUF 22" active>
              Bravado Buffalo
            </MenuRow>
            <MenuRow icon={<CarIcon />} description="Impounded, $250 to release" meta="SUL 07" disabled>
              Karin Sultan
            </MenuRow>
            <MenuRow checked onCheckedChange={() => {}}>
              Lock on store
            </MenuRow>
            <MenuRow tone="destructive" icon={<WrenchIcon />}>
              Sell to the scrapyard
            </MenuRow>
          </PanelBody>
          <PanelFooter className="justify-end">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Take out</Button>
          </PanelFooter>
        </Panel>
      </div>
    </div>
  );
}

const TONES = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  info: "bg-info text-info-foreground",
} as const;

/** A notice-shaped sample of one status colour on a panel. */
function Status({ tone, icon, title, text }: { tone: keyof typeof TONES; icon: ReactNode; title: string; text: string }) {
  return (
    <div className="nk-panel flex items-center gap-3 p-3">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", TONES[tone])}>{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{text}</span>
      </span>
    </div>
  );
}
