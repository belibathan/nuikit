import { emit, useNuiEvent } from "@nuikit/core/react";
import { Beer, Car, Droplet, Fuel, HeartPulse, Key, Phone, Shield, Shirt, Sandwich, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KeyHint } from "@/components/ui/key-hint";
import { NuiMenu } from "@/components/ui/nui-menu";
import { NuiToaster } from "@/components/ui/nui-toaster";
import { Speedometer } from "@/components/ui/speedometer";
import { TaskProgress } from "@/components/ui/task-progress";
import { Vital } from "@/components/ui/vital";
import { useNuiStore } from "@/hooks/use-nui-store";
import { cn } from "@/lib/utils";
import { Scene } from "./scene";

declare module "@nuikit/core" {
  interface NuiEvents {
    "hud:vitals": { health: number; armor: number; hunger: number; thirst: number };
    "hud:vehicle": { speed: number; rpm: number; gear: number; fuel: number };
    "hud:task": { label: string; duration: number } | null;
  }
}

/**
 * The live demo. Everything here is driven exactly like a real resource: a fake "Lua"
 * loop calls emit() (= SendNUIMessage) and the components subscribe with useNuiEvent.
 */
export function Stage({ className, menu = true, scene = "dusk" }: { className?: string; menu?: boolean; scene?: "dusk" | "day" }) {
  const vitals = useNuiStore("hud:vitals", { health: 86, armor: 54, hunger: 62, thirst: 18 });
  const car = useNuiStore("hud:vehicle", { speed: 0, rpm: 0.1, gear: 1, fuel: 41 });
  const [task, setTask] = useState<{ label: string; duration: number; key: number } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  useNuiEvent("hud:task", (t) => setTask(t ? { ...t, key: Date.now() } : null));
  useFakeLua();

  return (
    <div className={cn("relative isolate aspect-video w-full overflow-hidden rounded-2xl border bg-black shadow-2xl", className)}>
      <Scene variant={scene} />
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 1280, height: 720, transform: "scale(var(--stage-scale, 1))" }} ref={useFit()}>
        {/* zone C: player */}
        <div className="absolute bottom-10 left-10 flex items-end gap-2">
          <Vital label="Health" value={vitals.health} tone="destructive" icon={<HeartPulse />} size="lg" />
          <Vital label="Armor" value={vitals.armor} tone="chart-2" icon={<Shield />} size="lg" low={-1} />
          <Vital label="Hunger" value={vitals.hunger} tone="chart-3" icon={<Sandwich />} size="lg" />
          <Vital label="Thirst" value={vitals.thirst} tone="chart-1" icon={<Droplet />} size="lg" />
        </div>

        {/* zone D: vehicle */}
        <div className="absolute right-12 bottom-12">
          <Speedometer speed={car.speed} rpm={car.rpm} gear={car.gear} fuel={car.fuel} size={210} />
        </div>

        {/* zone E: prompt + progress */}
        <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
          {task && <TaskProgress key={task.key} label={task.label} duration={task.duration} onComplete={() => setTask(null)} />}
          <KeyHint keyLabel="E" hold={900} onConfirm={() => emit("nuikit:notify", { title: "Simeon", description: "\"Get in. We've got cars to sell.\"" })}>
            Talk to Simeon <span className="text-muted-foreground">· hold</span>
          </KeyHint>
        </div>

        {menu && (
          <div className="absolute top-24 left-10">
            <NuiMenu
              global={false}
              title="Premium Deluxe Motorsport"
              subtitle="↑↓ move · Enter select"
              items={[
                { id: "buy", label: "Buy vehicle", description: "Pegassi Zentorno · $725,000", icon: <Car />, meta: "$725k" },
                { id: "repair", label: "Repair", description: "Fix body and engine", icon: <Wrench />, meta: "$1,200" },
                { id: "keys", label: "Copy keys", description: "Give a set to a friend", icon: <Key /> },
                { id: "wrap", label: "Custom wrap", description: "Unlocks at rep 3", icon: <Shirt />, disabled: true },
              ]}
              onSelect={(i) => {
                setPicked(i.id);
                if (i.id === "repair") emit("hud:task", { label: "Repairing engine", duration: 3200 });
                else emit("nuikit:notify", { title: i.label, description: "fetchNui(\"shop:select\") → Lua", type: "success" });
              }}
              data-picked={picked ?? undefined}
            />
          </div>
        )}
        <NuiToaster position="top-right" style={{ position: "absolute" }} offset={24} />
      </div>
    </div>
  );
}

/** Scale the fixed 1280×720 HUD canvas to whatever width the stage has. */
function useFit() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty("--stage-scale", String(el.clientWidth / 1280)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return ref;
}

let running = 0;
/** Pretend to be the Lua side. One loop per page even with several stages. */
function useFakeLua() {
  useEffect(() => {
    if (running++) return () => void running--;
    let t = 0;
    let v = { health: 86, armor: 54, hunger: 62, thirst: 18 };
    const notes = [
      { title: "Paid", description: "+$500 from the dealer", type: "success" as const },
      { title: "Low thirst", description: "Grab a drink soon", type: "warning" as const },
      { title: "Officer nearby", description: "Keep it under the limit", type: "info" as const },
    ];
    const id = setInterval(() => {
      t += 0.1;
      const speed = Math.max(0, 62 + Math.sin(t * 0.7) * 48 + Math.sin(t * 2.3) * 6);
      const gear = Math.min(6, Math.max(1, Math.ceil(speed / 22)));
      const rpm = Math.min(0.97, 0.18 + ((speed % 22) / 22) * 0.75);
      emit("hud:vehicle", { speed, rpm, gear, fuel: 41 - (t % 30) });
      if (Math.round(t * 10) % 20 === 0) {
        v = {
          health: Math.max(8, v.health - Math.random() * 6),
          armor: Math.max(0, v.armor - Math.random() * 3),
          hunger: Math.max(10, v.hunger - 0.6),
          thirst: v.thirst < 8 ? 92 : v.thirst - 1.2,
        };
        if (v.health <= 10) v.health = 96;
        emit("hud:vitals", v);
      }
      if (Math.round(t * 10) % 70 === 0) emit("nuikit:notify", notes[Math.round(t * 10 / 70) % notes.length]!);
      if (Math.round(t * 10) % 110 === 55) emit("hud:task", { label: "Picking lock", duration: 2600 });
    }, 100);
    return () => {
      running--;
      clearInterval(id);
    };
  }, []);
}

export const radialItems = [
  { id: "phone", label: "Phone", icon: <Phone /> },
  { id: "car", label: "Vehicle", icon: <Car /> },
  { id: "keys", label: "Give keys", icon: <Key /> },
  { id: "drink", label: "Drink", icon: <Beer /> },
  { id: "fuel", label: "Refuel", icon: <Fuel /> },
  { id: "outfit", label: "Outfits", icon: <Shirt /> },
];
