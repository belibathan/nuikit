"use client";

import { useNuiEvent } from "@nuikit/core/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/**
 * NuiToaster — stock shadcn Sonner, wired to Lua. Mount once.
 *
 *   NUI.notify({ title = "Paid", description = "+$500 from the dealer", type = "success" })
 */
export interface NuiNotify {
  title: string;
  description?: string;
  type?: "default" | "success" | "info" | "warning" | "error";
  /** ms */
  duration?: number;
  id?: string | number;
}

declare module "@nuikit/core" {
  interface NuiEvents {
    "nuikit:notify": NuiNotify;
  }
}

export function NuiToaster(props: React.ComponentProps<typeof Toaster>) {
  useNuiEvent("nuikit:notify", ({ title, type = "default", ...opts }) => {
    const fn = type === "default" ? toast : toast[type];
    fn(title, opts);
  });
  return <Toaster position="top-right" {...props} />;
}
