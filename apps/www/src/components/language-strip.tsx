import { CarIcon, HeartPulseIcon, MicIcon, WrenchIcon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { studioTheme } from "@/lib/theme-studio";
import { identities } from "@/themes";

const SHOWN = ["Default", "Neon Pop", "Flat", "Square"];

/** The same component set under four shipped themes: the proof that values alone reach different languages. */
export function LanguageStrip() {
  const cells = SHOWN.map((n) => identities.find((t) => t.name === n)).filter((t) => !!t);
  return (
    <section className="mt-16" aria-labelledby="strip-title">
      <h2 id="strip-title" className="text-2xl font-semibold tracking-tight">
        One kit, four languages
      </h2>
      <p className="mt-2 max-w-3xl text-muted-foreground text-pretty">
        The same components under Default, Neon Pop, Flat and Square. Each is one theme file of values; no rule, no component edit.{" "}
        <a href="/design" className="text-foreground underline underline-offset-4">
          Your language in an hour
        </a>
        .
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cells.map((t) => (
          <Cell key={t.name} name={t.name} css={t.css} />
        ))}
      </div>
    </section>
  );
}

function Cell({ name, css }: { name: string; css: string }) {
  const el = useRef<HTMLDivElement>(null);
  const theme = useMemo(() => studioTheme(css), [css]);
  useLayoutEffect(() => {
    const node = el.current;
    if (node) applyStageTheme(theme, node);
    return () => {
      if (node) clearStageTheme(node);
    };
  }, [theme]);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{name}</p>
      <div ref={el} className="flex flex-col gap-4 rounded-lg border bg-background p-4 font-(family-name:--font-sans) text-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Take out</Button>
          <Button size="sm" variant="outline">
            Cancel
          </Button>
          <Kbd>E</Kbd>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip icon={<MicIcon />} active>
            Normal
          </Chip>
          <Chip icon={<WrenchIcon />}>Repair</Chip>
        </div>
        <Meter aria-label="Health" icon={<HeartPulseIcon />} value={72} low={20} tone="health" size="sm" />
        <Panel>
          <PanelHeader icon={<CarIcon />} title="Garage" description="4 of 6 spaces" />
          <PanelBody>
            <MenuRow icon={<CarIcon />} meta="ZEN 01">
              Zentorno
            </MenuRow>
            <MenuRow icon={<CarIcon />} meta="BUF 22" active>
              Buffalo
            </MenuRow>
            <MenuRow checked onCheckedChange={() => {}}>
              Lock on store
            </MenuRow>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
