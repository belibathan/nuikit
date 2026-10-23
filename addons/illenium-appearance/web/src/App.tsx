import { Dna, Glasses, LogOut, PenTool, Save, Scissors, Shirt, Smile, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
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
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { Chip } from "@/components/ui/chip";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { MenuRow } from "@/components/ui/menu-row";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { GroupNav } from "@/components/group";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Editor({ open }: { open: boolean }) {
  const { current, stored } = useLoaded();
  const sections = useSections();
  const only = sections.length === 1 ? sections[0]!.id : null;
  // home (null) → a section → one of its groups: each a page swapped in place inside the sheet
  const [section, setSection] = useState<string | null>(only);
  const [group, setGroup] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState<ReactNode>(null);
  useEffect(() => {
    if (!open) {
      setSection(only);
      setGroup(null);
    }
  }, [open, only]);
  const active = sections.find((s) => s.id === section);
  const dirty = useMemo(() => JSON.stringify(current) !== JSON.stringify(stored), [current, stored]);
  const nav = useMemo(() => ({ open: group, setOpen: setGroup, setTitle: setGroupTitle }), [group]);

  const back = group ? () => setGroup(null) : section && !only ? () => setSection(null) : undefined;
  const Icon = active?.icon;
  const title = group ? groupTitle : active ? active.title : "Appearance";
  const description = dirty ? "Unsaved changes" : group || active ? "Changes show on your character as you make them." : "Choose what to change.";

  return (
    // A floating edge sheet on the left (registry edge-sheet, the inventory's and ox_lib's model): the
    // sections as rows, a section's groups as rows, a group's controls as its own page, each swapped in
    // place with a back row. Save and exit sit in the floating tray along the bottom.
    <EdgeSheet
      open={open}
      side="left"
      width="30rem"
      // as tall as the page: two rows on a landing, the full column once a section's controls open
      fit
      page={`${section ?? "home"}:${group ?? ""}`}
      onBack={back}
      icon={!group && Icon ? <Icon /> : undefined}
      title={title}
      description={description}
      actions={dirty && <Chip variant="dot" tone="info" aria-label="Unsaved changes" />}
    >
      <EdgeSheetBody scroll>
        {active ? (
          <GroupNav.Provider value={nav}>
            <div className="ia-section" data-group-open={group ? "" : undefined}>
              <active.body />
            </div>
          </GroupNav.Provider>
        ) : (
          <div className="ia-groups" data-mode="list">
            {sections.map((s) => (
              <MenuRow key={s.id} className="min-h-12" icon={<s.icon className="size-4" />} chevron onClick={() => setSection(s.id)}>
                {s.title}
              </MenuRow>
            ))}
          </div>
        )}
      </EdgeSheetBody>
    </EdgeSheet>
  );
}

/** The floating tray along the bottom: turn, exit, save (the inventory's tray). */
function Tray({ open, onConfirm, canExit }: { open: boolean; onConfirm: (kind: "save" | "exit") => void; canExit: boolean }) {
  const keep = (e: Event) => e.preventDefault();
  return (
    <Sheet open={open} modal={false}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="nk-panel ia-tray"
        onOpenAutoFocus={keep}
        onCloseAutoFocus={keep}
        onInteractOutside={keep}
        onEscapeKeyDown={keep}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Save or exit</SheetTitle>
        <div className="flex items-center gap-4">
          <ActionBar>
            <ActionBarItem keys={["A", "D"]} label="Turn" />
            {canExit && <ActionBarItem keys={["Esc"]} label="Exit" />}
          </ActionBar>
          <Separator orientation="vertical" className="h-6!" />
          {canExit && (
            <Button variant="ghost" onClick={() => onConfirm("exit")}>
              <LogOut />
              Exit
            </Button>
          )}
          <Button className="min-w-32" onClick={() => onConfirm("save")}>
            <Save />
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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

  const modal = confirm ? locale?.modal[confirm] : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      {ready ? (
        <Editor open={open} />
      ) : (
        open && (
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
            <div className="nk-panel nk-enter flex items-center gap-2 px-4 py-3 nk-body text-muted-foreground">
              <Spinner />
              Loading
            </div>
          </div>
        )
      )}
      {open && ready && (
        <div className="pointer-events-none fixed inset-0 select-none">
          <div className="pointer-events-auto absolute top-1/2 right-6 -translate-y-1/2">
            <CameraControls />
          </div>
        </div>
      )}
      <Tray open={open && ready} onConfirm={setConfirm} canExit={!!config?.enableExit} />
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="nk-panel gap-4 p-6 data-[size=default]:sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="nk-title">{modal?.title}</AlertDialogTitle>
            <AlertDialogDescription>{modal?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale?.modal.decline}</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm === "exit" ? "destructive" : "default"}
              onClick={() => {
                if (confirm === "save") actions.save();
                else if (confirm === "exit") actions.exit();
              }}
            >
              {locale?.modal.accept}
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
