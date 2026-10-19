import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/** A section's groups. The first opens by default; several can be open at once. */
export function Groups({ children, open }: { children: ReactNode; open?: string[] }) {
  return (
    <Accordion type="multiple" defaultValue={open} className="px-4">
      {children}
    </Accordion>
  );
}

/** One collapsible group: title, optional meta on the right (current value, a count), controls inside. */
export function Group({ value, title, meta, changed, children }: { value: string; title: ReactNode; meta?: ReactNode; changed?: boolean; children: ReactNode }) {
  return (
    <AccordionItem value={value} className="border-border/60">
      <AccordionTrigger className="items-center py-3 hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{title}</span>
          {changed && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Changed" />}
          {meta !== undefined && <span className="ml-auto shrink-0 font-mono text-[11px] font-normal text-muted-foreground tabular-nums">{meta}</span>}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}
