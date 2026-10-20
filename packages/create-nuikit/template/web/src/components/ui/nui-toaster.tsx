"use client"

import * as React from "react"
import { useNuiEvent } from "nuikit-core/react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"

/**
 * NuiToaster — the stock shadcn Sonner Toaster, wired to Lua. Mount it once.
 *
 *   NUI.notify({ title = "Paid", description = "+$500 from the dealer", type = "success" })
 *
 * @deprecated Use `notice` (Notice, NoticeStack, and useNotices() + <Notices>): kit surfaces,
 * status tokens, eight positions, a time-left line, same-id updates. NuiToaster keeps working.
 */
type NuiNotify = {
  title: string
  description?: string
  type?: "default" | "success" | "info" | "warning" | "error"
  /** ms */
  duration?: number
  id?: string | number
}

declare module "nuikit-core" {
  interface NuiEvents {
    "nuikit:notify": NuiNotify
  }
}

/** @deprecated Use `notice`: useNotices() + <Notices> (see above). */
function NuiToaster(props: React.ComponentProps<typeof Toaster>) {
  useNuiEvent("nuikit:notify", ({ title, type = "default", ...options }) => {
    const show = type === "default" ? toast : toast[type]
    show(title, options)
  })
  return <Toaster position="top-right" {...props} />
}

export { NuiToaster, type NuiNotify }
