/** Every component, in the order the catalog lists them. One file per family. */
import { chip, dial, gauge, level, meter, ring, slab, speedometer } from "./hud";
import { field, list, menuRow, row, selection, stepper, text } from "./rows";
import { confirm, edgeSheet, notice, panel } from "./surfaces";
import { emptyState } from "./empty-state";
import { formField } from "./form-field";
import { grid, region, screen, zone } from "./layout";
import { radialMenu } from "./radial-menu";
import { selectionTabs } from "./selection-tabs";
import { control } from "./control";
import { vitalChip } from "./vital-chip";
import { countdown, itemSlot, keyPrompt, nuiImage, skillCheck, stat } from "./widgets";

export const COMPONENTS = {
  screen,
  zone,
  region,
  grid,
  control,
  panel,
  row,
  list,
  "menu-row": menuRow,
  selection,
  field,
  "form-field": formField,
  stepper,
  text,
  notice,
  confirm,
  "edge-sheet": edgeSheet,
  "empty-state": emptyState,
  "radial-menu": radialMenu,
  "selection-tabs": selectionTabs,
  chip,
  "vital-chip": vitalChip,
  meter,
  gauge,
  dial,
  ring,
  speedometer,
  level,
  slab,
  "item-slot": itemSlot,
  "key-prompt": keyPrompt,
  "skill-check": skillCheck,
  countdown,
  stat,
  "nui-image": nuiImage,
} as const;
