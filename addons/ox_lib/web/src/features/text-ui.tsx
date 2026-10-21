import { useState, type CSSProperties } from "react";
import { KeyPrompt, KeyPromptStack, keyPromptPosition, parseKeyText } from "@/components/ui/key-prompt";
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

/**
 * ox_lib's text UI (lib.showTextUI) as a KeyPrompt. Protocol: docs/ox-lib-protocol.md §11.
 *
 * Scripts write the key into the text: "[E] - Open garage", "**[E]** Pick up", "[Shift] + [E] Lock".
 * Leading keys become the prompt's keys and the rest its label (Markdown, wrapping). Text without a
 * leading key ("Press [E] to talk") is the label alone, as the script wrote it.
 */
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
  const text = String(data.text ?? "");
  const parsed = parseKeyText(text);
  const keys = parsed.keys;
  // without a leading key the text is kept whole (parseKeyText would strip a leading "- ", a list)
  const label = keys.length ? parsed.label : text;
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <KeyPromptStack position={keyPromptPosition(data.position)} data-state={presence.state} className={presenceMotion}>
        <KeyPrompt
          keys={keys}
          // ox_lib's icon is fixed width and takes the theme's muted colour unless the script sets one
          icon={data.icon ? <Icon icon={data.icon} color={data.iconColor} animation={data.iconAnimation} className="size-4" /> : undefined}
          // the label wraps (a script's text can be long or Markdown); with no leading key, no key chip
          wrap
          label={<Markdown gfm className="leading-5">{label}</Markdown>}
          style={parseStyle(data.style)}
          className={cn(data.alignIcon === "top" && "items-start")}
        />
      </KeyPromptStack>
    </div>
  );
}
