import { isBrowser } from "nuikit-core";
import { useEffect } from "react";
import { AlertDialog } from "@/features/alert-dialog";
import { ContextMenu } from "@/features/context-menu";
import { InputDialog } from "@/features/input-dialog";
import { ListMenu } from "@/features/list-menu";
import { Notifications } from "@/features/notifications";
import { ProgressBar, ProgressCircle } from "@/features/progress";
import { RadialMenu } from "@/features/radial-menu";
import { SkillCheck } from "@/features/skill-check";
import { TextUi } from "@/features/text-ui";
import { applyOxConfig } from "@/lib/config";
import { setLocale } from "@/lib/locale";
import { post, useOx } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";

/** Copy without the async Clipboard API, which CEF NUI doesn't reliably allow. */
function copy(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } finally {
    el.remove();
  }
}

export default function App() {
  useOx<Record<string, unknown>>("setLocale", (l) => setLocale(l));
  useOx<string>("setClipboard", (text) => copy(String(text ?? "")));

  useEffect(() => {
    void post("init"); // Lua answers with setLocale
    void (async () => {
      const themed = await loadServerTheme();
      const config = await post<{ primaryColor?: string; primaryShade?: number }>("getConfig");
      if (!themed && !isBrowser()) applyOxConfig(config);
    })();
  }, []);

  return (
    <>
      <TextUi />
      <ProgressBar />
      <ProgressCircle />
      <ListMenu />
      <ContextMenu />
      <RadialMenu />
      <SkillCheck />
      <InputDialog />
      <AlertDialog />
      <Notifications />
    </>
  );
}
