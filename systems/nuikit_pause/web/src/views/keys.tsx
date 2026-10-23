import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { EmptyState } from "@/components/ui/empty-state";
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
        <EmptyState title="Reading your keys" description="Asking the game…" />
      ) : (
        [...groups].map(([group, rows], i) => (
          <SheetSection key={group || i} label={group || undefined}>
            <MenuRowList>
              {rows.map((k) => (
                <MenuRow key={k.label} inert kbd={k.key || undefined} meta={k.key ? undefined : "Not bound"}>{k.label}</MenuRow>
              ))}
            </MenuRowList>
          </SheetSection>
        ))
      )}
    </SheetPage>
  );
}
