import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// shadcn's Sonner, minus next-themes (NUI has no system theme to follow).
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
}
