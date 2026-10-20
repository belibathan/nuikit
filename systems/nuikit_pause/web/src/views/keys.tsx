import { useNuiState } from "nuikit-core/react";
import { KeyboardIcon } from "lucide-react";
import { Fragment } from "react";
import type { KeyBinding } from "../nui";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

/** The player's keys right now, read live from the game (client/keys.lua). */
export function KeysPanel({ onChange }: { onChange: () => void }) {
  const keys = useNuiState("pause:keys", [] as KeyBinding[]);
  const groups = new Map<string, KeyBinding[]>();
  for (const k of Array.isArray(keys) ? keys : []) {
    const g = k.group ?? "";
    groups.set(g, [...(groups.get(g) ?? []), k]);
  }

  return (
    <Panel size="lg" className="max-h-[calc(100vh-6rem)]">
      <PanelHeader
        icon={<KeyboardIcon />}
        title="Key bindings"
        description="Your keys right now"
        actions={
          <Button variant="outline" size="sm" onClick={onChange}>
            Change keys
          </Button>
        }
      />
      <PanelBody scroll className="max-h-[36rem]">
        {groups.size === 0 ? (
          <p className="nk-row text-muted-foreground">Reading your keys from the game…</p>
        ) : (
          [...groups].map(([group, rows], i) => (
            <Fragment key={group || i}>
              {group && <p className="nk-label px-3 pt-3 pb-1 first:pt-1">{group}</p>}
              {rows.map((k) => (
                <div key={k.label} className="nk-row justify-between">
                  <span className="truncate">{k.label}</span>
                  {k.key ? <Kbd className="min-w-8">{k.key}</Kbd> : <span className="nk-label">Not bound</span>}
                </div>
              ))}
            </Fragment>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
