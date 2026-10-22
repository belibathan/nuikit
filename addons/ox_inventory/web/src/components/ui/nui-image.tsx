// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/nui-image.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { getImageConfig, loadImageConfig, onImageConfig, resolveImage, type ImageConfig, type ImageKey, type ImageKind } from "nuikit-core"
import { ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * NuiImage — the picture of an item, a piece of clothing, a vehicle or a weapon, by the conventions
 * popular servers already use (docs/images.md): it asks nuikit-core's resolveImage for the candidate
 * URLs, tries them one after another (lazy, an onError chain, never a broken-image icon) and shows
 * `fallback` (default: a quiet image icon) when none load.
 *
 *   <NuiImage kind="item" imageKey="water" className="size-10" />
 *   <NuiImage kind="vehicle" imageKey="sultan" className="aspect-video w-full object-cover" />
 *   <NuiImage kind="clothing" imageKey={{ model, type: "component", id: 11, drawable: 5, texture: 0 }} />
 *
 * The server's own templates come from the nuikit resource (`setr nuikit_images_<kind>`); the first
 * NuiImage on a page asks for them once.
 */

/** The server's image templates, live: loads them once per page and re-renders when they arrive. */
function useImageConfig(): ImageConfig {
  const [config, setConfig] = React.useState(getImageConfig)
  React.useEffect(() => {
    const off = onImageConfig(() => setConfig(getImageConfig()))
    void loadImageConfig().then(() => setConfig(getImageConfig()))
    return off
  }, [])
  return config
}

function NuiImage({
  kind,
  imageKey,
  urls,
  fallback,
  className,
  alt = "",
  ...props
}: Omit<React.ComponentProps<"img">, "src"> & {
  kind: ImageKind
  imageKey: ImageKey
  /** Candidate URLs to try before the conventions (an item's own image path, say). */
  urls?: string[]
  /** What shows when nothing loads. Default: a muted image icon in the same box. null: nothing. */
  fallback?: React.ReactNode
}) {
  const config = useImageConfig()
  const candidates = React.useMemo(
    () => [...(urls ?? []), ...resolveImage(kind, imageKey, config)].filter((u, i, a) => a.indexOf(u) === i),
    // imageKey may be a fresh object each render: compare it by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, JSON.stringify(imageKey), JSON.stringify(urls), config]
  )
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => setIndex(0), [candidates])

  const src = candidates[index]
  if (!src) {
    if (fallback === null) return null
    return (
      <span data-slot="nui-image" data-missing className={cn("flex items-center justify-center text-muted-foreground/50", className)}>
        {fallback ?? <ImageIcon className="size-1/2 max-h-6 max-w-6" strokeWidth={1.25} />}
      </span>
    )
  }
  return (
    <img
      data-slot="nui-image"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setIndex((i) => i + 1)}
      className={cn("object-contain", className)}
      {...props}
    />
  )
}

export { NuiImage, useImageConfig }
