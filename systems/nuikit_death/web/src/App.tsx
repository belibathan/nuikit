import { Surface } from "nuikit-core/react";
import { CheckIcon, HeartPulseIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DeathData } from "./nui";
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

function clock(s: number) {
  const t = Math.max(0, Math.ceil(s));
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function Death({ data }: { data: DeathData }) {
  const laststand = data.phase === "laststand";
  const hasTimer = typeof data.seconds === "number";
  const seconds = data.seconds ?? 0;
  const total = data.total && data.total > 0 ? data.total : undefined;
  const urgent = hasTimer && seconds <= 30;
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
          <div className="death-in mt-12 flex flex-col items-center" style={{ animationDelay: "120ms" }}>
            <div
              className={cn(
                "death-clock nk-num text-[8rem] leading-none font-semibold",
                urgent && laststand ? "death-urgent text-destructive" : "text-foreground",
                !laststand && seconds <= 0 && "text-foreground/40",
              )}
              role="timer"
              aria-live="off"
            >
              {clock(seconds)}
            </div>
            <div className="mt-4 text-sm font-medium text-foreground/75">{label}</div>
            {total ? (
              <Meter
                value={seconds}
                max={total}
                size="sm"
                tone={laststand ? "destructive" : "foreground"}
                aria-label={label}
                className="mt-6 w-80"
              />
            ) : null}
          </div>
        ) : (
          <div className="death-in mt-12 text-sm font-medium text-foreground/75" style={{ animationDelay: "120ms" }}>
            Waiting to respawn
          </div>
        )}

        <Hints data={data} />
      </div>
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
          <div className="flex flex-col gap-2">
            <Hint kbd={respawn.key} label="Hold to respawn" meta={respawn.cost ? money.format(respawn.cost) : undefined} />
            <Meter value={respawn.progress ?? 0} max={1} size="sm" tone="foreground" aria-label="Respawn hold" className="w-full" />
          </div>
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
