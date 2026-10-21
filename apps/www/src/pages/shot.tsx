import { useLayoutEffect, useMemo, useRef } from "react";
import { BLOCKS } from "@/components/block-previews";
import { Scene } from "@/components/scene";
import { studioTheme } from "@/lib/theme-studio";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { identities, themes } from "@/themes";

/**
 * /blocks/shot?block=<name>&state=<state>&identity=<graphite|signal|velvet|vector|neutral…>
 *
 * One block state, full viewport, over a game scene, on the NUI scale (1rem = 1.4815vh: 16px at
 * 1080p, as in game), so Playwright at 1920×1080, 2560×1440 and 1280×720 sees what the game shows.
 * The harness: bench/blocks/shots.mjs. Not linked from the site.
 */
export function ShotPage() {
  const q = new URLSearchParams(location.search);
  const block = BLOCKS.find((b) => b.name === q.get("block")) ?? BLOCKS[0]!;
  const names = Object.keys(block.states);
  const state = q.get("state") && block.states[q.get("state")!] ? q.get("state")! : names[0]!;
  const wanted = (q.get("identity") ?? "graphite").toLowerCase();
  const preset = [...identities, ...themes].find((t) => t.name.toLowerCase() === wanted) ?? identities[0]!;
  const theme = useMemo(() => studioTheme(preset.css), [preset.css]);

  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    document.documentElement.style.fontSize = "1.4815vh";
    document.body.style.margin = "0";
    applyStageTheme(theme, el);
    return () => {
      clearStageTheme(el);
      document.documentElement.style.fontSize = "";
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" data-shot={`${block.name}/${state}`}>
      <Scene variant={block.scene} />
      <div ref={stage} className="absolute inset-0 text-foreground">
        {block.states[state]!()}
      </div>
    </div>
  );
}
