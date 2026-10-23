/** Every component, in the order the catalog lists them. One file per component family. */
import { tile } from "./tile";
import { vitalChip } from "./vital-chip";

export const COMPONENTS = {
  tile,
  "vital-chip": vitalChip,
} as const;
