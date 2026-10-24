/** Every component, in the order the catalog lists them. One file per family. */
import { chip, dial, gauge, level, meter, ring, slab, speedometer } from "./hud";
import { field, list, menuRow, row, selection, stepper, text } from "./rows";
import { caption, confirm, display, edgeSheet, notice, panel } from "./surfaces";
import { grid, region, screen, zone } from "./layout";
import { tile } from "./tile";
import { vitalChip } from "./vital-chip";
import { countdown, itemSlot, keyPrompt, nuiImage, skillCheck, stat } from "./widgets";

export const COMPONENTS = {
  screen,
  zone,
  region,
  grid,
  tile,
  panel,
  display,
  caption,
  row,
  list,
  "menu-row": menuRow,
  selection,
  field,
  stepper,
  text,
  notice,
  confirm,
  "edge-sheet": edgeSheet,
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
