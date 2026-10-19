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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
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
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        <h1 className="truncate text-lg leading-none font-semibold tracking-tight">{active?.title}</h1>
        {dirty && (
          <Badge variant="secondary" className="ml-auto">
            Unsaved
          </Badge>
        )}
      </header>
      {sections.length > 1 && (
        <div className="px-3 pb-3">
          <TabsList className="h-auto w-full">
            {sections.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="h-9 p-0 dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                aria-label={s.title}
              >
                {/* The tooltip sits inside: its data-state must not replace the tab's active state. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex size-full items-center justify-center">
                      <s.icon className="size-[18px]" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{s.title}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}
      <div className="h-px bg-border" />
      {sections.map((s) => (
        <TabsContent key={s.id} value={s.id} className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <s.body />
          </ScrollArea>
        </TabsContent>
      ))}
      <div className="h-px bg-border" />
      <footer className="space-y-3 p-4">
        <div className="flex gap-2">
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
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Kbd>A</Kbd>
          <Kbd>D</Kbd>
          turn your character
        </p>
      </footer>
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
        <aside className="appearance-panel pointer-events-auto absolute top-6 bottom-6 left-6 flex w-[380px] flex-col overflow-hidden rounded-xl border bg-background/90 text-foreground shadow-2xl backdrop-blur-md">
          {ready ? (
            <Editor onConfirm={setConfirm} />
          ) : (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading
            </div>
          )}
        </aside>
        {ready && (
          <div className="absolute top-1/2 right-6 -translate-y-1/2">
            <CameraControls />
          </div>
        )}
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{modal?.title}</AlertDialogTitle>
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
