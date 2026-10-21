import { Surface, useFollow } from "nuikit-core/react";
import { CheckIcon, HeartCrackIcon, HeartPulseIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { DeathData } from "./nui";
import { Countdown } from "@/components/ui/countdown";
import { Kbd } from "@/components/ui/kbd";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function App() {
  // input 'none': the medical resource listens for E/G in game, so this never takes focus.
  return (
    <Surface name="death" layer="system" input="none" hides={["hud"]}>
      {(data) => (data ? <Death data={data} /> : null)}
    </Surface>
  );
}

function Death({ data }: { data: DeathData }) {
  const laststand = data.phase === "laststand";
  const hasTimer = typeof data.seconds === "number";
  const seconds = data.seconds ?? 0;
  const total = data.total && data.total > 0 ? data.total : undefined;
  const bleeding = laststand || data.medical === "esx_death" || data.medical === "esx";
  const label = bleeding ? "Until you bleed out" : seconds > 0 ? "Until you can respawn" : "You can respawn";

  return (
    <div className={cn("death-root absolute inset-0 overflow-hidden", laststand ? "death-laststand" : "death-dead")}>
      <div className="death-tint absolute inset-0" aria-hidden />
      <div className="death-vignette absolute inset-0" aria-hidden />

      {/* content sits above centre; the bottom of the screen stays clear for the medical resource's own text */}
      <div className="death-text absolute inset-x-0 top-[20%] flex flex-col items-center px-12 text-center">
        <h1 className="death-in text-[2rem] leading-10 font-semibold tracking-tight">
          {data.title ?? (laststand ? "You are down" : "You are unconscious")}
        </h1>
        {data.subtitle ? (
          <p className="death-in mt-2 max-w-xl text-base text-foreground/75" style={{ animationDelay: "60ms" }}>
            {data.subtitle}
          </p>
        ) : null}

        {hasTimer ? (
          // The kit's Countdown: mm:ss at the hero size, the label, the line that drains (with a
          // total), dimmed at 00:00. In last stand the line drains red throughout (as in 0.6.0) and
          // the clock turns red and pulses in the last 30 s.
          <Countdown
            seconds={seconds}
            total={total}
            label={label}
            size="hero"
            warnAt={laststand ? 30 : undefined}
            lineTone={laststand ? "destructive" : "neutral"}
            className="death-in mt-12"
            style={{ animationDelay: "120ms" }}
          />
        ) : (
          <div className="death-in mt-12 text-sm font-medium text-foreground/75" style={{ animationDelay: "120ms" }}>
            Waiting to respawn
          </div>
        )}

        <Hints data={data} />
      </div>

      {data.band !== false && <Band data={data} laststand={laststand} seconds={hasTimer ? seconds : undefined} />}
    </div>
  );
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

/**
 * The incapacitated band (design v2 §4.5, reference screens): one line along the bottom edge in the
 * kit's band slab, destructive-toned. Left the state, right the phase and the clock in the numeric
 * face. It keeps to the last 2.5rem, under the medical resources' own text (README).
 */
function Band({ data, laststand, seconds }: { data: DeathData; laststand: boolean; seconds?: number }) {
  const state = laststand ? "Incapacitated" : "Unconscious";
  const detail = data.estimated ? "Estimated" : laststand ? "Bleeding out" : seconds !== undefined && seconds > 0 ? "Respawn in" : data.respawn?.available ? "Respawn available" : "Waiting for EMS";
  return (
    <div
      data-slot="death-band"
      className="nk-slab-band death-band absolute inset-x-0 bottom-0 flex-row justify-between [--nk-slab-tone-rgb:var(--destructive-rgb)]"
      style={{ animationDelay: "240ms" }}
      aria-live="off"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <HeartCrackIcon className="size-4 text-destructive" />
        {state}
      </span>
      <span className="nk-caption flex items-center gap-2">
        {detail}
        {seconds !== undefined && (
          <>
            <span aria-hidden className="opacity-50">
              ·
            </span>
            <span className="nk-num [font-family:var(--nk-num-font)]">{`${pad(seconds / 60)}:${pad(seconds % 60)}`}</span>
          </>
        )}
      </span>
    </div>
  );
}

function Hints({ data }: { data: DeathData }) {
  const { respawn, ems, helpable } = data;
  if (!respawn && !ems && !helpable) return null;
  return (
    <div className="death-in mt-12 flex items-start gap-6" style={{ animationDelay: "180ms" }}>
      {helpable && !ems ? <Hint icon={<HeartPulseIcon className="text-destructive" />} label="Another player can revive you" /> : null}

      {ems ? (
        ems.state === "requested" ? (
          <Hint icon={<CheckIcon />} label="EMS have been notified" />
        ) : ems.state === "cooldown" ? (
          <Hint kbd={ems.key} muted label="Request EMS" meta={`in ${ems.seconds ?? 0}s`} />
        ) : (
          <Hint kbd={ems.key} label="Request EMS" />
        )
      ) : null}

      {respawn ? (
        respawn.available ? (
          <HoldToRespawn kbd={respawn.key} cost={respawn.cost} />
        ) : (
          <Hint
            kbd={respawn.key}
            muted
            label={respawn.wait ? "Respawn" : "Respawn after the timer"}
            meta={respawn.wait ? `in ${respawn.wait}s` : undefined}
          />
        )
      ) : null}
    </div>
  );
}

/**
 * "Hold E to respawn" and its bar. The bar follows death:hold, a live value (NUI.stream) of how long
 * E has been held against how long the medical resource needs: painted on animation frames between
 * messages, without a React render, so it moves smoothly. React keeps the Meter at 0 and never
 * overwrites the painted width.
 */
function HoldToRespawn({ kbd, cost }: { kbd: string; cost?: number }) {
  const root = useRef<HTMLDivElement>(null);
  useFollow(
    "death:hold",
    (v) => {
      const p = Math.max(0, Math.min(1, v)) * 100;
      const bar = root.current?.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
      if (bar) {
        bar.style.transition = "none";
        bar.style.transform = `translateX(-${100 - p}%)`;
      }
      root.current?.querySelector('[role="progressbar"]')?.setAttribute("aria-valuenow", String(Math.round(p)));
    },
    { start: 0 },
  );
  return (
    <div ref={root} className="flex flex-col gap-2">
      <Hint kbd={kbd} label="Hold to respawn" meta={cost ? money.format(cost) : undefined} />
      <Meter value={0} max={1} size="sm" tone="foreground" aria-label="Respawn hold" className="w-full" />
    </div>
  );
}

function Hint({ kbd, icon, label, meta, muted }: { kbd?: string; icon?: ReactNode; label: string; meta?: string; muted?: boolean }) {
  return (
    <div className={cn("flex h-6 items-center gap-2 text-sm font-medium whitespace-nowrap [&>svg]:size-4", muted ? "text-foreground/50" : "text-foreground")}>
      {kbd ? <Kbd className={cn("h-6 min-w-6", muted ? "bg-foreground/10 text-foreground/60" : "bg-foreground text-background")}>{kbd}</Kbd> : null}
      {icon}
      <span>{label}</span>
      {meta ? <span className="nk-num text-foreground/60">{meta}</span> : null}
    </div>
  );
}
