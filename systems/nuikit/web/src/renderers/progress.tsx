// progress → `meter` (bar) or `progress-ring`. The run is timed here; when the time is up the
// intent resolves true. A cancel from Lua (the X key, death, a ragdoll) arrives as a cancel message
// and the renderer simply stops drawing it: the caller already got false.
// With `value`, the script drives it (nk.progress{...}:update{ value = 40 }) and the clock is off.
import { Text } from "@/lib/text";
import type { ProgressProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Meter } from "@/components/ui/meter";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

function ProgressRenderer({ intents, ctx }: RendererProps<"progress">) {
  // One at a time, like every library: the newest. An older one waits behind it, undrawn, and runs
  // when it ends (a script that opens two is better off cancelling the first).
  const top = intents[intents.length - 1];
  if (!top) return null;
  return <OneProgress key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

function OneProgress({ id, props, ctx }: { id: string; props: ProgressProps; ctx: RendererProps<"progress">["ctx"] }) {
  const driven = props.value !== undefined;
  const duration = Math.max(1, props.duration);
  useEffect(() => {
    if (driven) {
      if ((props.value ?? 0) >= 100) ctx.resolve(id, true);
      return;
    }
    // One timer for the whole run (a page reload mid-run restarts it: unproven in game, docs/intents.md).
    const t = setTimeout(() => ctx.resolve(id, true), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, driven, driven ? props.value : duration]);

  const ring = props.style === "ring";
  const center = props.position === "center";
  const cancel = props.cancel ? props.cancelKey ?? "X" : undefined;

  return (
    <div data-intent="progress" data-style={ring ? "ring" : "bar"} className={cn("nk-enter absolute inset-x-0 flex justify-center", center ? "inset-y-0 items-center" : "bottom-[20%]")}>
      {ring ? (
        <ProgressRing
          size="lg"
          duration={driven ? undefined : duration}
          value={driven ? props.value : undefined}
          label={props.label ? <Text>{props.label}</Text> : undefined}
          aria-label={props.label ?? "Progress"}
          tone={props.tone ?? "primary"}
          track="game"
          center={props.showPercent === false ? false : undefined}
          cancelKey={cancel}
        />
      ) : (
        <div className="nk-on-game flex w-[22rem] flex-col gap-2 text-(color:--hud-foreground)">
          <Meter
            size="lg"
            track="game"
            tone={props.tone ?? "primary"}
            duration={driven ? undefined : duration}
            value={driven ? props.value : undefined}
            label={props.label ? <Text>{props.label}</Text> : ""}
            aria-label={props.label ?? "Progress"}
            valueText={props.showPercent && driven ? `${Math.round(props.value ?? 0)}%` : undefined}
          />
          {cancel && (
            <span className="nk-shadow nk-text-label flex items-center justify-end gap-1.5 text-current opacity-80">
              <Kbd className="h-5 min-w-5">{cancel}</Kbd> Cancel
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default defineReactRenderer({ kind: "progress", Component: ProgressRenderer, version: 1 });
