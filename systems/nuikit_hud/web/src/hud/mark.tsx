// A lone mark (the gear, a compass letter, a telltale): the kit's VitalChip without a value. The vitals, voice,
// radio and slots compose VitalChip in pills.tsx; this is the same chip showing only a glyph or an icon (and, for
// a telltale, a short label on its plate).
import type { ReactNode } from "react";
import { VitalChip } from "@/components/ui/vital-chip";

export interface MarkProps {
  /** a letter or number on the face (the gear, N) */
  glyph?: ReactNode;
  /** an icon on the face */
  icon?: ReactNode;
  size?: "sm" | "md";
  active?: boolean;
  alert?: boolean;
  /** the plate slides out with the label */
  open?: boolean;
  label?: ReactNode;
  className?: string;
}

export function Mark({ glyph, icon, size = "md", active, alert, open = false, label, className }: MarkProps) {
  return (
    <VitalChip.Root active={active} alert={alert} open={open} display="auto" data-size={size} className={className}>
      <VitalChip.Shape>
        <VitalChip.Icon>{glyph !== undefined ? <VitalChip.Letter>{glyph}</VitalChip.Letter> : icon}</VitalChip.Icon>
        {label !== undefined && label !== false && <VitalChip.Label>{label}</VitalChip.Label>}
      </VitalChip.Shape>
    </VitalChip.Root>
  );
}
