import { useRef, useState, type CSSProperties } from "react";
import { KeyPrompt, KeyPromptStack, keyPromptPosition, parseKeyText, type KeyPromptPosition } from "@/components/ui/key-prompt";
import { Icon } from "@/lib/icon";
import { parseStyle, textUiIntent } from "@/lib/intents";
import { Markdown } from "@/lib/markdown";
import { useOx } from "@/lib/nui";
import { usePresence } from "@/lib/presence";
import { openIntent, type Handle } from "@/lib/route";
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

/**
 * ox_lib's text UI (lib.showTextUI) as a KeyPrompt. Protocol: docs/ox-lib-protocol.md §11.
 *
 * Scripts write the key into the text: "[E] - Open garage", "**[E]** Pick up", "[Shift] + [E] Lock".
 * Leading keys become the prompt's keys and the rest its label (Markdown, wrapping). Text without a
 * leading key ("Press [E] to talk") is the label alone, as the script wrote it.
 */
/**
 * The prompt slides in from its own edge and back out to it, like the notices (#102): a short slide
 * and a fade in, a faster one out (the presence keeps it mounted for the exit).
 */
const SLIDE: Record<KeyPromptPosition, string> = {
  "top-left": "data-[state=open]:slide-in-from-left-4 data-[state=closed]:slide-out-to-left-4",
  "center-left": "data-[state=open]:slide-in-from-left-4 data-[state=closed]:slide-out-to-left-4",
  "bottom-left": "data-[state=open]:slide-in-from-left-4 data-[state=closed]:slide-out-to-left-4",
  "top-right": "data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4",
  "center-right": "data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4",
  "bottom-right": "data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4",
  "top-center": "data-[state=open]:slide-in-from-top-4 data-[state=closed]:slide-out-to-top-2",
  "bottom-center": "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2",
};
const MOTION =
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=open]:ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150 data-[state=closed]:ease-in data-[state=closed]:fill-mode-forwards";

export function TextUi() {
  const [data, setData] = useState<TextUiData | null>(null);
  const [open, setOpen] = useState(false);
  const presence = usePresence(open, 150);

  const routed = useRef<Handle | null>(null);

  // Routed (docs/adapters/ox-lib.md §3): the frame's prompt stack; a new text replaces it in place.
  useOx<TextUiData>("textUi", (d) => {
    const handle = openIntent("prompt", textUiIntent(d as unknown as Record<string, unknown>), {
      key: "textui",
      onLocal: () => {
        setData(d);
        setOpen(true);
      },
    });
    if (handle) {
      routed.current = handle;
      setOpen(false);
    }
  });
  useOx("textUiHide", () => {
    routed.current?.cancel();
    routed.current = null;
    setOpen(false);
  });

  if (!presence.mounted || !data) return null;
  const text = String(data.text ?? "");
  const parsed = parseKeyText(text);
  const keys = parsed.keys;
  const position = keyPromptPosition(data.position);
  // without a leading key the text is kept whole (parseKeyText would strip a leading "- ", a list)
  const label = keys.length ? parsed.label : text;
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <KeyPromptStack position={position} data-state={presence.state} className={cn(MOTION, SLIDE[position])}>
        <KeyPrompt
          keys={keys}
          // ox_lib's icon is fixed width and takes the theme's muted colour unless the script sets one
          icon={data.icon ? <Icon icon={data.icon} color={data.iconColor} animation={data.iconAnimation} className="size-4" /> : undefined}
          // the label wraps (a script's text can be long or Markdown); with no leading key, no key chip
          wrap
          label={<Markdown gfm className="leading-5">{label}</Markdown>}
          style={parseStyle(data.style) as CSSProperties | undefined}
          className={cn(data.alignIcon === "top" && "items-start")}
        />
      </KeyPromptStack>
    </div>
  );
}
