import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import { CarIcon, FuelIcon, ShieldIcon, WarehouseIcon, WrenchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Kbd } from "@/components/ui/kbd"
import { MenuRow } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { formatMoney, useFormatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { GarageAnswer, GarageData, GarageVehicle, GarageVehicleState } from "./nui"

/**
 * Garage — your vehicles at one garage: a list you can filter by where they are, and the selected
 * one's fuel, engine and body. Take one out, store the one you're driving, or pay to release one from
 * the impound; Lua decides, and an error it answers stays on the panel. Built from the kit: Panel,
 * MenuRow, Meter, Money, EmptyState, with stock shadcn Tabs, Button, Kbd and Spinner.
 *
 *   <GarageSurface />                                   // wired: nk.surface('garage', …) in Lua opens it
 *   <Garage data={data} onAction={…} />                 // a still, or your own wiring
 *
 * Keys: Up / Down pick a vehicle, Enter does its main action, Esc closes.
 */
function GarageSurface() {
  return (
    <Surface name="garage" layer="panel" exclusive>
      {(data) =>
        data ? (
          <Garage
            data={data}
            onAction={(action, id) =>
              (action === "store"
                ? fetchNui("garage:store")
                : fetchNui(action === "takeOut" ? "garage:takeOut" : "garage:release", { id: id! })
              ).catch(() => ({ ok: false, error: "The garage didn't answer. Try again." }))
            }
          />
        ) : null
      }
    </Surface>
  )
}

export type GarageAction = "takeOut" | "store" | "release"

const FILTERS: { value: "all" | GarageVehicleState; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stored", label: "Stored" },
  { value: "out", label: "Out" },
  { value: "impounded", label: "Impounded" },
]

/** What the row says about where a vehicle is. */
function garageWhere(v: GarageVehicle, fmt: (amount: number) => string = formatMoney) {
  if (v.state === "stored") return v.location ?? "Stored here"
  if (v.state === "out") return v.location ?? "Out"
  return v.fee ? `Impounded, ${fmt(v.fee)} to release` : (v.location ?? "Impounded")
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function Garage({
  data,
  onAction,
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: GarageData
  /** Ask Lua; resolve with its answer. */
  onAction?: (action: GarageAction, id?: string) => Promise<GarageAnswer> | void
  /** Focus the list when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const fmt = useFormatMoney()
  const vehicles = list(data.vehicles)
  const [filter, setFilter] = React.useState<"all" | GarageVehicleState>("all")
  const shown = filter === "all" ? vehicles : vehicles.filter((v) => v.state === filter)
  const [selectedId, setSelectedId] = React.useState(() => vehicles.find((v) => v.state === "stored")?.id ?? vehicles[0]?.id)
  const selected = shown.find((v) => v.id === selectedId) ?? shown[0]
  const [busy, setBusy] = React.useState<GarageAction | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const rows = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => setError(null), [selected?.id, data])
  React.useEffect(() => {
    if (autoFocus) rows.current?.querySelector<HTMLElement>("[data-active]")?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, filter])

  const act = (action: GarageAction, id?: string) => {
    if (!onAction || busy) return
    setBusy(action)
    setError(null)
    void Promise.resolve(onAction(action, id))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(null))
  }
  const primary = (v: GarageVehicle | undefined) => {
    if (v?.state === "stored") act("takeOut", v.id)
    else if (v?.state === "impounded") act("release", v.id)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      primary(selected)
      return
    }
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
    if (!dir || !shown.length) return
    e.preventDefault()
    const i = Math.max(0, shown.findIndex((v) => v.id === selected?.id))
    const next = shown[(i + dir + shown.length) % shown.length]!
    setSelectedId(next.id)
    requestAnimationFrame(() => rows.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`)?.focus())
  }

  const count = (s: GarageVehicleState) => vehicles.filter((v) => v.state === s).length

  return (
    <div data-slot="garage" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="nk-anchor-r flex items-start gap-4">
        {selected && <GarageDetail vehicle={selected} busy={busy} error={error} onPrimary={() => primary(selected)} />}

        <Panel size="lg">
          <PanelHeader
            icon={<WarehouseIcon />}
            title={data.title}
            description={data.description ?? `${count("stored")} of ${vehicles.length} vehicles here`}
            tabs={
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="w-full">
                  {FILTERS.map((f) => (
                    <TabsTrigger key={f.value} value={f.value}>
                      {f.label}
                      {f.value !== "all" && <span className="nk-num text-muted-foreground">{count(f.value)}</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            }
          />
          <PanelBody scroll className="max-h-[22rem]">
            <div ref={rows} className="flex flex-col gap-0.5" onKeyDown={onKeyDown}>
              {shown.length ? (
                shown.map((v) => (
                  <MenuRow
                    key={v.id}
                    data-id={v.id}
                    icon={<CarIcon />}
                    description={garageWhere(v, fmt)}
                    meta={<span className="font-mono">{v.plate}</span>}
                    active={v.id === selected?.id}
                    className={cn(v.state !== "stored" && "[&_[data-slot=menu-row-description]]:text-muted-foreground", v.state === "impounded" && "[&_[data-slot=menu-row-description]]:text-warning")}
                    onClick={() => setSelectedId(v.id)}
                  >
                    {v.label}
                  </MenuRow>
                ))
              ) : vehicles.length ? (
                <EmptyState icon={<CarIcon />} title="Nothing in this list" description="Pick another tab." />
              ) : (
                <EmptyState icon={<CarIcon />} title="No vehicles here yet" description="Drive one in and store it." />
              )}
            </div>
          </PanelBody>
          <PanelFooter className="nk-label whitespace-nowrap">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Pick
            <Kbd className="ml-2">Enter</Kbd>
            {selected?.state === "impounded" ? "Release" : "Take out"}
            {data.canStore && (
              <Button variant="outline" size="sm" className="ml-auto" disabled={!!busy} onClick={() => act("store")}>
                {busy === "store" ? <Spinner /> : <WarehouseIcon />}
                Store vehicle
              </Button>
            )}
          </PanelFooter>
        </Panel>
      </div>
    </div>
  )
}

/** The selected vehicle: its state and condition, and the one thing you can do with it. */
function GarageDetail({
  vehicle: v,
  busy,
  error,
  onPrimary,
}: {
  vehicle: GarageVehicle
  busy: GarageAction | null
  error: string | null
  onPrimary: () => void
}) {
  const fmt = useFormatMoney()
  const action = v.state === "stored" ? "takeOut" : v.state === "impounded" ? "release" : null
  return (
    <Panel size="sm" key={v.id}>
      <PanelHeader icon={<CarIcon />} title={v.label} description={[v.class, v.plate].filter(Boolean).join(", ")} />
      <PanelBody variant="form">
        <Meter icon={<FuelIcon />} label="Fuel" value={v.fuel} valueText={`${Math.round(v.fuel)}%`} low={15} tone="foreground" />
        <Meter icon={<WrenchIcon />} label="Engine" value={v.engine} valueText={`${Math.round(v.engine)}%`} low={30} tone="foreground" />
        <Meter icon={<ShieldIcon />} label="Body" value={v.body} valueText={`${Math.round(v.body)}%`} low={30} tone="foreground" />
        <p className={cn("text-sm", v.state === "impounded" ? "text-warning" : "text-muted-foreground")}>{garageWhere(v, fmt)}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </PanelBody>
      <PanelFooter>
        {action ? (
          <Button className="flex-1" disabled={!!busy} onClick={onPrimary}>
            {busy === action && <Spinner />}
            {action === "takeOut" ? "Take out" : `Release${v.fee ? ` for ${fmt(v.fee)}` : ""}`}
          </Button>
        ) : (
          <Button className="flex-1" variant="outline" disabled>
            Already out
          </Button>
        )}
      </PanelFooter>
    </Panel>
  )
}

export { Garage, GarageSurface, garageWhere }
