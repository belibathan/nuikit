import { useEffect, useRef, type ReactNode } from "react";
import { Scene } from "@/components/scene";
import { cn } from "@/lib/utils";

/**
 * A 1920×1080 game screen scaled to fit its box, over a game scene: what the kit looks like in game
 * at 1080p (1rem = 16px there, as in every nuikit UI), whatever the page's width. Children are laid
 * out on the full 1920×1080 screen, so nk-anchor-* and nk-edge work as in a real UI.
 */
export function GameStage({
  children,
  className,
  scene = "dusk",
  stageRef,
}: {
  children: ReactNode;
  className?: string;
  scene?: "dusk" | "day";
  /** The 1920×1080 screen element (theme it with applyTheme(theme, element)). */
  stageRef?: React.Ref<HTMLDivElement>;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty("--game-scale", String(el.clientWidth / 1920)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={cn("relative isolate aspect-video w-full overflow-hidden rounded-xl border bg-black", className)}>
      <Scene variant={scene} />
      <div
        ref={stageRef}
        className="absolute top-0 left-0 origin-top-left text-foreground"
        style={{ width: 1920, height: 1080, transform: "scale(var(--game-scale, 0.5))" }}
      >
        {children}
      </div>
    </div>
  );
}
