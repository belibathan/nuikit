import { useEffect, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { post, useOx } from "@/lib/nui";
import { usePresence } from "@/lib/presence";

type Difficulty = "easy" | "medium" | "hard" | { areaSize: number; speedMultiplier: number };

const PRESETS = {
  easy: { areaSize: 50, speedMultiplier: 1 },
  medium: { areaSize: 40, speedMultiplier: 1.5 },
  hard: { areaSize: 25, speedMultiplier: 1.75 },
} as const;

interface Check {
  size: number;
  speed: number;
  start: number;
  key: string;
}

const resolve = (d: Difficulty) => {
  const p = typeof d === "string" ? (PRESETS[d] ?? PRESETS.easy) : d;
  return { size: Number(p.areaSize) || 50, speed: Math.max(0.0001, Number(p.speedMultiplier) || 1) };
};

function roll(d: Difficulty, inputs?: string[]): Check {
  const { size, speed } = resolve(d);
  const lo = 120;
  const hi = Math.max(lo + 1, 360 - size);
  const start = lo + Math.floor(Math.random() * (hi - lo));
  const key = inputs?.length ? String(inputs[Math.floor(Math.random() * inputs.length)]).toLowerCase() : "e";
  return { size, speed, start, key };
}

/** event.key, with ox_lib's fallback to event.code for non-Latin layouts. */
function keyOf(e: KeyboardEvent): string {
  const k = e.key.toLowerCase();
  if (k.length === 1 && k.charCodeAt(0) >= 880) {
    if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
    if (e.code.startsWith("Digit")) return e.code.slice(5);
  }
  return k;
}

/** ox_lib's skill check (lib.skillCheck). Protocol: docs/ox-lib-protocol.md §10. */
export function SkillCheck() {
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [angle, setAngle] = useState(0);
  const queue = useRef<{ list: Difficulty[]; i: number; inputs?: string[] }>({ list: [], i: 0 });
  const live = useRef<{ check: Check | null; t0: number; angle: number; done: boolean }>({ check: null, t0: 0, angle: 0, done: true });
  const presence = usePresence(open, 100);

  const finish = (ok: boolean) => {
    if (live.current.done) return;
    live.current.done = true;
    setOpen(false);
    void post("skillCheckOver", ok);
  };

  const begin = (c: Check) => {
    live.current = { check: c, t0: performance.now(), angle: 0, done: false };
    setCheck(c);
    setAngle(0);
  };

  useOx<{ difficulty: Difficulty | Difficulty[]; inputs?: string[] }>("startSkillCheck", (d) => {
    const list = Array.isArray(d.difficulty) ? d.difficulty : [d.difficulty];
    const inputs = d.inputs?.map((k) => String(k).toLowerCase());
    queue.current = { list, i: 0, inputs };
    begin(roll(list[0] ?? "easy", inputs));
    setOpen(true);
  });
  useOx("skillCheckCancel", () => finish(false)); // Lua's promise only resolves if the UI posts

  // The sweep: one clockwise revolution from 12 o'clock in 2000 ms / speed.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = (now: number) => {
      const s = live.current;
      if (s.done || !s.check) return;
      const a = ((now - s.t0) / (2000 / s.check.speed)) * 360;
      if (a >= 360) return finish(false);
      s.angle = a;
      setAngle(a);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, check]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const s = live.current;
      if (s.done || !s.check || e.repeat) return;
      const k = keyOf(e);
      const q = queue.current;
      if (q.inputs?.length && !q.inputs.includes(k)) return; // keys outside `inputs` don't count
      const hit = k === s.check.key && s.angle >= s.check.start && s.angle <= s.check.start + s.check.size;
      if (!hit) return finish(false);
      if (q.i + 1 < q.list.length) {
        q.i += 1;
        begin(roll(q.list[q.i]!, q.inputs));
      } else finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!presence.mounted || !check) return null;
  const r = 50;
  const C = 2 * Math.PI * r;
  const arc = (from: number, len: number) => ({
    strokeDasharray: `${(len / 360) * C} ${C}`,
    transform: `rotate(${from - 90}deg)`,
    transformOrigin: "60px 60px",
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div
        data-state={presence.state}
        className="relative size-[150px] [@media(min-height:1440px)]:size-[190px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <svg viewBox="0 0 120 120" className="size-full overflow-visible">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-card/85" />
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-primary" style={arc(check.start, check.size)} />
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="16" className="stroke-destructive" style={arc(angle, 3)} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <Kbd className="h-8 min-w-8 text-base uppercase">{check.key}</Kbd>
        </div>
      </div>
    </div>
  );
}
