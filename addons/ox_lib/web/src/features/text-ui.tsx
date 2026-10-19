import { useState, type CSSProperties } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
import { useOx } from "@/lib/nui";
import { presenceMotion } from "@/lib/motion";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

interface TextUiData {
  text: string;
  position?: "right-center" | "left-center" | "top-center" | "bottom-center";
  icon?: string | [string, string];
  iconColor?: string;
  iconAnimation?: string;
  alignIcon?: "top" | "center";
  style?: CSSProperties | string;
}

// --nk-edge (1.5rem) from the screen edge.
const POS = {
  "right-center": "right-6 top-1/2 -translate-y-1/2",
  "left-center": "left-6 top-1/2 -translate-y-1/2",
  "top-center": "top-6 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
} as const;

/**
 * Scripts write the key into the text: "[E] - Open garage", "**[E]** Pick up". A leading key
 * becomes a Kbd next to the action; anything else renders as the script wrote it.
 */
function splitKey(text: string): { key?: string; rest: string } {
  const m = /^\s*(\*\*|__)?\[([^\]\s]{1,12})\](\*\*|__)?\s*(?:[-–—:]\s*)?/.exec(text);
  if (!m || (m[1] ?? "") !== (m[3] ?? "")) return { rest: text };
  const rest = text.slice(m[0].length);
  return rest.trim() ? { key: m[2], rest } : { rest: text };
}

/** CSS text ("color: red; font-size: 12px") to a style object. ox_lib's own UI crashes on this. */
function parseStyle(style: TextUiData["style"]): CSSProperties | undefined {
  if (!style) return undefined;
  if (typeof style !== "string") return style;
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (prop) out[prop] = decl.slice(i + 1).trim();
  }
  return out;
}

/** ox_lib's text UI (lib.showTextUI). Protocol: docs/ox-lib-protocol.md §11. */
export function TextUi() {
  const [data, setData] = useState<TextUiData | null>(null);
  const [open, setOpen] = useState(false);
  const presence = usePresence(open, 100);

  useOx<TextUiData>("textUi", (d) => {
    setData(d);
    setOpen(true);
  });
  useOx("textUiHide", () => setOpen(false));

  if (!presence.mounted || !data) return null;
  const { key, rest } = splitKey(String(data.text ?? ""));
  return (
    <div className={cn("pointer-events-none fixed z-10", POS[data.position ?? "right-center"] ?? POS["right-center"])}>
      <div
        data-state={presence.state}
        style={parseStyle(data.style)}
        className={cn(
          "nk-panel flex min-h-10 max-w-80 gap-3 px-3 py-2 text-sm font-medium",
          data.alignIcon === "top" ? "items-start" : "items-center",
          presenceMotion,
        )}
      >
        {data.icon && (
          <span className={cn("grid h-5 shrink-0 place-items-center", !data.iconColor && "text-muted-foreground")}>
            <Icon icon={data.icon} color={data.iconColor} animation={data.iconAnimation} className="size-4" />
          </span>
        )}
        {key && <Kbd className="h-6 min-w-6 px-1.5 text-xs">{key}</Kbd>}
        <Markdown gfm className="leading-5">{rest}</Markdown>
      </div>
    </div>
  );
}
