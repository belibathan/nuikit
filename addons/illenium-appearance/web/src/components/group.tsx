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

/** One collapsible group: a 40px row with title and current value, controls inside. */
export function Group({ value, title, meta, changed, children }: { value: string; title: ReactNode; meta?: ReactNode; changed?: boolean; children: ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="h-10 items-center py-0 hover:no-underline [&>svg]:translate-y-0">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{title}</span>
          {changed && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Changed" />}
          {meta !== undefined && <span className="nk-num ml-auto shrink-0 text-xs font-normal text-muted-foreground">{meta}</span>}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-4 pt-1 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}
