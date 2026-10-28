import { CarIcon, CupSodaIcon, MicIcon, RadioIcon } from "@/components/ui/icons";
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { KeyPrompt } from "@/components/ui/key-prompt";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Notice, NoticeStack } from "@/components/ui/notice";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// The variants (density, shape, motion, size) of the registry components seen most, driven by one set of
// knobs: /components shows them under the site theme or an identity, /theme under the theme being made.

const CARS = [
  { name: "Pegassi Zentorno", note: "Stored, 98% condition", plate: "ZEN 01" },
  { name: "Bravado Buffalo", note: "Out, last seen in Vinewood", plate: "BUF 22" },
  { name: "Karin Sultan", note: "Impounded, $250 to release", plate: "SUL 07" },
  { name: "Declasse Vigero", note: "Stored, 64% condition", plate: "VIG 13" },
];

type Knob<T extends string> = { label: string; value: T; options: readonly T[]; set: (v: T) => void };

function KnobTabs<T extends string>({ label, value, options, set }: Knob<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="nk-label text-muted-foreground">{label}</span>
      <Tabs value={value} onValueChange={(v) => set(v as T)}>
        <TabsList>
          {options.map((o) => (
            <TabsTrigger key={o} value={o} className="capitalize">
              {o}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

/** One set of knobs, five components: every variant the registry's most-seen components take. */
export function VariantsDemo() {
  const [size, setSize] = useState<"sm" | "default" | "lg">("default");
  const [density, setDensity] = useState<"compact" | "default" | "comfortable">("default");
  const [shape, setShape] = useState<"square" | "default" | "round">("default");
  const [motion, setMotion] = useState<"on" | "reduced" | "off">("on");
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const v = { density, shape, motion: motion === "on" ? undefined : motion === "off" ? false : ("reduced" as const) };
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <KnobTabs label="Size" value={size} options={["sm", "default", "lg"] as const} set={setSize} />
        <KnobTabs label="Density" value={density} options={["compact", "default", "comfortable"] as const} set={setDensity} />
        <KnobTabs label="Shape" value={shape} options={["square", "default", "round"] as const} set={setShape} />
        <KnobTabs label="Motion" value={motion} options={["on", "reduced", "off"] as const} set={(m) => (setMotion(m), setRun((r) => r + 1))} />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <Panel size={size} {...v}>
          <PanelHeader icon={<CarIcon />} title="Garage" description="Legion Square" />
          <PanelBody>
            <MenuRowList active={active} {...v}>
              {CARS.map((c, i) => (
                <MenuRow key={c.plate} icon={<CarIcon />} description={c.note} meta={c.plate} active={i === active} onMouseEnter={() => setActive(i)} {...v}>
                  {c.name}
                </MenuRow>
              ))}
            </MenuRowList>
          </PanelBody>
        </Panel>
        <div className="flex flex-col items-start gap-4">
          <div className="relative h-48 w-[26rem] [--nk-screen-edge:0rem]">
            <NoticeStack position="top-right" key={`n${run}`} {...v}>
              <Notice size={size} status="success" title="Paid" description="$500 from Lester" duration={0} />
              <Notice item={{ name: "Water bottle", count: 2, icon: <CupSodaIcon /> }} duration={0} />
            </NoticeStack>
          </div>
          {/* the attribute on any element: the chips' corners follow it (a chip's own `shape` is pill or tile) */}
          <div className="flex gap-2" data-nk-shape={shape === "default" ? undefined : shape}>
            <Chip material="hud" icon={<MicIcon />} active density={density} motion={v.motion}>
              Normal
            </Chip>
            <Chip material="hud" icon={<RadioIcon />} density={density} motion={v.motion}>
              101 MHz
            </Chip>
          </div>
          <KeyPrompt keys="E" label="Open garage" size={size === "lg" ? "default" : size} {...v} />
          <div className="flex w-72 flex-col gap-3">
            <Meter label="Fuel" value={64} valueText="64%" size={size} {...v} />
            <Meter key={`m${run}`} variant="slab" label="Repairing" duration={4000} cancelKey="X" onComplete={() => setTimeout(() => setRun((r) => r + 1), 800)} {...v} />
          </div>
        </div>
      </div>
    </div>
  );
}
