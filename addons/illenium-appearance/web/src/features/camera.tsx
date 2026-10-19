// Floating camera / pose / clothing preview controls (docs/illenium-appearance-protocol.md §6).
import { ArrowDownToLine, Footprints, HardHat, PersonStanding, Repeat2, RotateCcw, RotateCw, ScanFace, Shirt } from "lucide-react";
import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLoaded } from "@/lib/store";

function Tip({ label, children, kbd }: { label: string; children: ReactNode; kbd?: string }) {
  return (
    <Tooltip>
      {/* Wrapped: the tooltip's own data-state must not replace the toggle's on/off state. */}
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="left" className="flex items-center gap-2">
        {label}
        {kbd && <Kbd>{kbd}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

// Off: a quiet icon. On: the accent fill, so the icon itself reads as the state.
const ICON = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

/** Three groups (view, orbit, undress) separated by hairlines; the tooltips name each control. */
export function CameraControls() {
  const { camera, rotate, clothes, actions } = useLoaded();
  const cam = (key: "head" | "body" | "bottom", label: string, icon: ReactNode) => (
    <Tip label={camera[key] ? "Back to full view" : label}>
      <Toggle className={ICON} pressed={camera[key]} onPressedChange={() => actions.setCamera(key)} aria-label={label}>
        {icon}
      </Toggle>
    </Tip>
  );
  const wear = (key: "head" | "body" | "bottom", label: string, icon: ReactNode) => (
    <Tip label={clothes[key] ? `Put ${label} back on` : `Take off ${label}`}>
      <Toggle className={ICON} pressed={clothes[key]} onPressedChange={() => actions.toggleClothes(key)} aria-label={`Toggle ${label}`}>
        {icon}
      </Toggle>
    </Tip>
  );

  return (
    <div className="nk-panel nk-enter pointer-events-auto flex flex-col items-center gap-1 p-1">
      {cam("head", "Focus on face", <ScanFace />)}
      {cam("body", "Focus on body", <PersonStanding />)}
      {cam("bottom", "Focus on legs", <ArrowDownToLine />)}
      <Separator className="my-1 !w-6" />
      <Tip label={rotate.left ? "Back to front view" : "Orbit left"}>
        <Toggle className={ICON} pressed={rotate.left} onPressedChange={() => actions.rotate("left")} aria-label="Orbit camera left">
          <RotateCcw />
        </Toggle>
      </Tip>
      <Tip label={rotate.right ? "Back to front view" : "Orbit right"}>
        <Toggle className={ICON} pressed={rotate.right} onPressedChange={() => actions.rotate("right")} aria-label="Orbit camera right">
          <RotateCw />
        </Toggle>
      </Tip>
      <Tip label="Turn around">
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={actions.turnAround} aria-label="Turn around">
          <Repeat2 />
        </Button>
      </Tip>
      <Separator className="my-1 !w-6" />
      {wear("head", "headwear", <HardHat />)}
      {wear("body", "top", <Shirt />)}
      {wear("bottom", "trousers & shoes", <Footprints />)}
    </div>
  );
}
