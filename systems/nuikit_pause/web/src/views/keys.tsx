import { useNuiState } from "nuikit-core/react";
import type { KeyBinding } from "../nui";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SheetPage, SheetSection } from "./sheet";

/** The player's keys right now, read live from the game (client/keys.lua), grouped, as rows in the sheet. */
export function KeysPage({ onBack, onChange }: { onBack: () => void; onChange: () => void }) {
  const keys = useNuiState("pause:keys", [] as KeyBinding[]);
  const groups = new Map<string, KeyBinding[]>();
  for (const k of Array.isArray(keys) ? keys : []) {
    const g = k.group ?? "";
    groups.set(g, [...(groups.get(g) ?? []), k]);
  }
  return (
    <SheetPage
      title="Key bindings"
      description="Your keys right now"
      onBack={onBack}
      actions={
        <Button variant="outline" size="sm" onClick={onChange}>
          Change keys
        </Button>
      }
    >
      {groups.size === 0 ? (
        <p className="nk-row px-0 text-muted-foreground">Reading your keys from the game…</p>
      ) : (
        [...groups].map(([group, rows], i) => (
          <SheetSection key={group || i} label={group || undefined}>
            <div className="flex flex-col divide-y divide-border">
              {rows.map((k) => (
                <div key={k.label} className="nk-row min-h-11 justify-between px-0">
                  <span className="truncate">{k.label}</span>
                  {k.key ? <Kbd className="min-w-8">{k.key}</Kbd> : <span className="nk-label">Not bound</span>}
                </div>
              ))}
            </div>
          </SheetSection>
        ))
      )}
    </SheetPage>
  );
}
