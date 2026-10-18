import { useState, type CSSProperties } from "react";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
import { useOx } from "@/lib/nui";
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

const POS = {
  "right-center": "right-2 top-1/2 -translate-y-1/2",
  "left-center": "left-2 top-1/2 -translate-y-1/2",
  "top-center": "top-2 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
} as const;

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
  return (
    <div className={cn("pointer-events-none fixed z-10", POS[data.position ?? "right-center"] ?? POS["right-center"])}>
      <div
        data-state={presence.state}
        style={parseStyle(data.style)}
        className={cn(
          "flex gap-3 rounded-md border bg-card/95 px-3 py-2.5 text-base text-card-foreground shadow-lg",
          data.alignIcon === "top" ? "items-start" : "items-center",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200",
        )}
      >
        {data.icon && <Icon icon={data.icon} color={data.iconColor} animation={data.iconAnimation} className="size-5 shrink-0" />}
        <Markdown gfm>{data.text}</Markdown>
      </div>
    </div>
  );
}
