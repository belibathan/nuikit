import { Dna, Glasses, LogOut, PenTool, Save, Scissors, Shirt, Smile, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Panel, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CameraControls } from "@/features/camera";
import { ComponentsSection, PropsSection } from "@/features/clothing";
import { HairSection } from "@/features/hair";
import { FaceSection, HeritageSection } from "@/features/heritage";
import { PedSection } from "@/features/ped";
import { TattoosSection } from "@/features/tattoos";
import { AppearanceProvider, useAppearance, useLoaded } from "@/lib/store";
import { loadServerTheme } from "@/lib/theme";

type Section = { id: string; title: string; icon: ComponentType<{ className?: string }>; body: ComponentType };

function useSections(): Section[] {
  const { config, locale, isFreemode } = useLoaded();
  return useMemo(() => {
    const all: (Section & { on: boolean })[] = [
      { id: "ped", on: config.ped, title: locale.ped.title, icon: Users, body: PedSection },
      { id: "heritage", on: config.headBlend && isFreemode, title: locale.headBlend.title, icon: Dna, body: HeritageSection },
      { id: "face", on: config.faceFeatures && isFreemode, title: locale.faceFeatures.title, icon: Smile, body: FaceSection },
      { id: "hair", on: config.headOverlays, title: locale.headOverlays.title, icon: Scissors, body: HairSection },
      { id: "clothes", on: config.components, title: locale.components.title, icon: Shirt, body: ComponentsSection },
      { id: "props", on: config.props, title: locale.props.title, icon: Glasses, body: PropsSection },
      { id: "tattoos", on: config.tattoos && isFreemode, title: locale.tattoos.title, icon: PenTool, body: TattoosSection },
    ];
    return all.filter((s) => s.on);
  }, [config, locale, isFreemode]);
}

function Editor({ onConfirm }: { onConfirm: (kind: "save" | "exit") => void }) {
  const { config, current, stored } = useLoaded();
  const sections = useSections();
  const [tab, setTab] = useState(sections[0]?.id ?? "");
  const active = sections.find((s) => s.id === tab) ?? sections[0];
  const dirty = useMemo(() => JSON.stringify(current) !== JSON.stringify(stored), [current, stored]);

  return (
    <Tabs value={active?.id ?? ""} onValueChange={setTab} className="flex h-full min-h-0 flex-col gap-0">
      {/* The kit's two-row header (docs/design.md recipe): title row, then the section tabs. */}
      <PanelHeader
        title={active?.title}
        actions={
          dirty && (
            <span className="nk-label flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Unsaved changes
            </span>
          )
        }
        tabs={
          sections.length > 1 && (
            <TabsList className="w-full">
              {sections.map((s) => (
                <TabsTrigger key={s.id} value={s.id} className="p-0" aria-label={s.title}>
                  {/* The tooltip sits inside: its data-state must not replace the tab's active state. */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex size-full items-center justify-center">
                        <s.icon className="size-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{s.title}</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
              ))}
            </TabsList>
          )
        }
      />
      {sections.map((s) => (
        <TabsContent key={s.id} value={s.id} className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <s.body />
          </ScrollArea>
        </TabsContent>
      ))}
      <PanelFooter>
        {config.enableExit && (
          <Button variant="outline" onClick={() => onConfirm("exit")}>
            <LogOut />
            Exit
          </Button>
        )}
        <Button className="flex-1" onClick={() => onConfirm("save")}>
          <Save />
          Save
        </Button>
      </PanelFooter>
    </Tabs>
  );
}

function Shell() {
  const state = useAppearance();
  const { open, ready, locale, config, actions } = state;
  const [confirm, setConfirm] = useState<"save" | "exit" | null>(null);
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (!open) setConfirm(null);
  }, [open]);

  // a / d turn the ped 10° (as the original page does); Escape asks to exit when exiting is allowed.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (confirmRef.current) return;
      const k = e.key.toLowerCase();
      if (k === "a") actions.turnPed("left");
      else if (k === "d") actions.turnPed("right");
      else if (e.key === "Escape" && config?.enableExit && !document.querySelector("[data-radix-popper-content-wrapper]")) setConfirm("exit");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, actions, config?.enableExit]);

  if (!open) return null;
  const modal = confirm ? locale.modal[confirm] : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="pointer-events-none fixed inset-0 select-none">
        <Panel className="pointer-events-auto absolute top-6 bottom-6 left-6 w-96">
          {ready ? (
            <Editor onConfirm={setConfirm} />
          ) : (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading
            </div>
          )}
        </Panel>
        {ready && (
          <div className="absolute top-1/2 right-6 -translate-y-1/2">
            <CameraControls />
          </div>
        )}
        {ready && (
          <p className="nk-chip absolute bottom-6 left-1/2 -translate-x-1/2 gap-2 pl-1.5">
            <span className="flex gap-1">
              <Kbd>A</Kbd>
              <Kbd>D</Kbd>
            </span>
            Turn your character
          </p>
        )}
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="nk-panel nk-enter gap-4 p-6 data-[size=default]:sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="nk-title text-[0.9375rem] leading-5">{modal?.title}</AlertDialogTitle>
            <AlertDialogDescription>{modal?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale.modal.decline}</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm === "exit" ? "destructive" : "default"}
              onClick={() => {
                if (confirm === "save") actions.save();
                else if (confirm === "exit") actions.exit();
              }}
            >
              {locale.modal.accept}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default function App() {
  useEffect(() => {
    void loadServerTheme();
  }, []);
  return (
    <AppearanceProvider>
      <Shell />
    </AppearanceProvider>
  );
}
