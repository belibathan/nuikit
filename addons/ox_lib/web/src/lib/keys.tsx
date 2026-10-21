import { Kbd } from "@/components/ui/kbd";

/**
 * The Enter chip on a dialog's primary action (reference screens: the key sits in the button, so the
 * player sees that Enter is the same as the click). Only where Enter really submits.
 */
export function EnterKey() {
  return (
    <Kbd aria-hidden className="ml-1 h-4 bg-primary-foreground/15 px-1 text-[0.6875rem] text-primary-foreground/90">
      Enter
    </Kbd>
  );
}
