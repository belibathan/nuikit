import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { CarFrontIcon, CarIcon, TimerIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { ColorField } from "@/components/ui/form-field"
import { MenuRow } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { Money, formatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { VehicleShopAnswer, VehicleShopChoice, VehicleShopData, VehicleShopPayment, VehicleShopVehicle } from "./nui"

/**
 * VehicleShop — a showroom: the vehicles by category on the left, the selected one's stats, a paint
 * colour (swatches or any hex), cash or bank, a test drive, and buy with a confirm. The real car
 * stands in the showroom behind the panels (Lua spawns a local preview when the page asks), so the
 * panels sit on the left edge. Built from the kit: Panel, MenuRow, Meter, Money, ColorField (from
 * form-field), Confirm, with stock Tabs, Button and Spinner.
 *
 *   <VehicleShopSurface />                              // wired: nk.surface('vehicle-shop', …) in Lua
 *   <VehicleShop data={data} onBuy={…} onClose={…} />   // a still, or your own wiring
 *
 * Escape goes through the surface (escape = 'back'): it closes the confirm first, then the shop.
 */
function VehicleShopSurface() {
  const shop = useSurface("vehicle-shop")
  const back = React.useRef<() => void>(() => shop.close())
  const fail = (): VehicleShopAnswer => ({ ok: false, error: "The dealership didn't answer. Try again." })
  return (
    <Surface name="vehicle-shop" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <VehicleShop
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => shop.close()}
            onPreview={(choice) => void fetchNui("vehicle-shop:preview", choice).catch(fail)}
            onTestDrive={(choice) => fetchNui("vehicle-shop:test-drive", choice).catch(fail)}
            onBuy={(choice, payment) => fetchNui("vehicle-shop:buy", { ...choice, payment }).catch(fail)}
          />
        ) : null
      }
    </Surface>
  )
}

const PAYMENT: Record<VehicleShopPayment, { label: string; short: string }> = {
  cash: { label: "Cash", short: "cash" },
  bank: { label: "Bank", short: "money in the bank" },
}

const STATS = [
  ["speed", "Top speed"],
  ["acceleration", "Acceleration"],
  ["braking", "Braking"],
  ["handling", "Handling"],
] as const

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** What's wrong with buying `vehicle` now, in plain words, or null. The server checks it again. */
function vehicleShopError(vehicle: VehicleShopVehicle | undefined, payment: VehicleShopPayment, wallet: VehicleShopData["wallet"]): string | null {
  if (!vehicle) return "Pick a vehicle."
  if (vehicle.locked) return `You can't buy the ${vehicle.label}${vehicle.lockedReason ? ` (${vehicle.lockedReason})` : ""}.`
  if (vehicle.price > (wallet[payment] ?? 0)) return `You don't have enough ${PAYMENT[payment].short}.`
  return null
}

function VehicleShop({
  data,
  onPreview,
  onTestDrive,
  onBuy,
  onClose,
  onBack,
  autoFocus = true,
  defaultSelected,
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: VehicleShopData
  /** Show this vehicle in this colour in the showroom (debounced). */
  onPreview?: (choice: VehicleShopChoice) => void
  onTestDrive?: (choice: VehicleShopChoice) => Promise<VehicleShopAnswer> | void
  onBuy?: (choice: VehicleShopChoice, payment: VehicleShopPayment) => Promise<VehicleShopAnswer> | void
  onClose?: () => void
  /** Gives the surface what Escape should do now (close the confirm, else the shop). */
  onBack?: (fn: () => void) => void
  /** Focus the selected vehicle when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** The vehicle to start on (stills). Default: the first. */
  defaultSelected?: string
  /** Start with the confirm open (stills). */
  confirming?: boolean
}) {
  const vehicles = list(data.vehicles)
  const categories = list(data.categories)
  const colours = list(data.colours)
  const payments = list(data.payment).length ? list(data.payment) : (["bank"] as VehicleShopPayment[])
  const first = vehicles.find((v) => v.id === defaultSelected) ?? vehicles[0]
  const [tab, setTab] = React.useState(first?.category ?? categories[0]?.id ?? "all")
  const [selectedId, setSelectedId] = React.useState(first?.id)
  // nuikit-ignore-next-line color/hardcoded: the car's default paint (black) is data, not the theme
  const [colour, setColour] = React.useState<string | null>(colours[0] ?? "#0b0b0b")
  const [payment, setPayment] = React.useState<VehicleShopPayment>(payments[0]!)
  const [confirming, setConfirming] = React.useState(!!confirmingProp)
  const [busy, setBusy] = React.useState<"buy" | "test" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const rows = React.useRef<HTMLDivElement>(null)

  const shown = categories.length ? vehicles.filter((v) => v.category === tab) : vehicles
  const vehicle = vehicles.find((v) => v.id === selectedId)
  const problem = vehicleShopError(vehicle, payment, data.wallet ?? {})
  const choice = vehicle && colour ? { id: vehicle.id, colour } : null

  // Escape: the confirm first, then the shop.
  React.useEffect(() => {
    onBack?.(() => (confirming ? setConfirming(false) : onClose?.()))
  }, [confirming, onBack, onClose])

  // The showroom follows the selection and the paint (debounced: dragging through swatches or
  // typing a hex doesn't respawn the car on every step).
  const preview = React.useRef(onPreview)
  preview.current = onPreview
  React.useEffect(() => {
    if (!choice) return
    const t = setTimeout(() => preview.current?.(choice), 150)
    return () => clearTimeout(t)
  }, [choice?.id, choice?.colour]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => rows.current?.querySelector<HTMLElement>("[data-active]")?.focus(), 0)
    return () => clearTimeout(t)
  }, [autoFocus])

  const ask = (kind: "buy" | "test", call: Promise<VehicleShopAnswer> | void) => {
    setBusy(kind)
    setError(null)
    void Promise.resolve(call)
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
      })
      .finally(() => {
        setBusy(null)
        setConfirming(false)
      })
  }

  return (
    <div data-slot="vehicle-shop" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="nk-anchor-l flex items-start gap-4">
        <Panel size="auto" className="nk-enter w-80">
          <PanelHeader
            icon={<CarIcon />}
            title={data.title}
            description={data.description}
            tabs={
              categories.length ? (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="w-full">
                    {categories.map((c) => (
                      <TabsTrigger key={c.id} value={c.id}>
                        {c.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              ) : undefined
            }
          />
          <PanelBody scroll className="max-h-[28rem]">
            <div
              ref={rows}
              role="listbox"
              aria-label="Vehicles"
              onKeyDown={(e) => {
                const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
                if (!dir) return
                const all = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-slot=menu-row]")]
                const next = all[all.indexOf(document.activeElement as HTMLButtonElement) + dir]
                if (!next) return
                e.preventDefault()
                next.focus()
                next.click()
              }}
            >
              {shown.map((v) => (
                <MenuRow
                  key={v.id}
                  role="option"
                  aria-selected={v.id === selectedId}
                  active={v.id === selectedId}
                  description={v.locked ? v.lockedReason : v.brand}
                  meta={<Money amount={v.price} />}
                  className={cn(v.locked && "opacity-60")}
                  onClick={() => {
                    setSelectedId(v.id)
                    setError(null)
                  }}
                >
                  {v.label}
                </MenuRow>
              ))}
            </div>
          </PanelBody>
        </Panel>

        {vehicle && (
          <Panel size="auto" className="nk-enter w-96" data-slot="vehicle-shop-detail">
            <PanelHeader
              icon={<CarFrontIcon />}
              title={vehicle.label}
              description={vehicle.brand}
              actions={<Money amount={vehicle.price} size="md" />}
            />
            <PanelBody className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-2.5">
                {STATS.map(([key, label]) =>
                  vehicle.stats?.[key] !== undefined ? <Meter key={key} label={label} value={vehicle.stats[key]} valueText={`${Math.round(vehicle.stats[key]!)}`} /> : null
                )}
                {vehicle.seats !== undefined && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground [&_svg]:size-3.5">
                    <UsersIcon /> {vehicle.seats} {vehicle.seats === 1 ? "seat" : "seats"}
                  </p>
                )}
              </div>
              <ColorField label="Colour" swatches={colours} value={colour} onValueChange={setColour} />
              {payments.length > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="nk-label">Pay with</span>
                  <Tabs value={payment} onValueChange={(v) => setPayment(v as VehicleShopPayment)}>
                    <TabsList>
                      {payments.map((p) => (
                        <TabsTrigger key={p} value={p}>
                          {PAYMENT[p].label} <Money amount={data.wallet?.[p] ?? 0} className="text-muted-foreground" />
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </PanelBody>
            <PanelFooter className="flex flex-col items-stretch gap-2">
              {(error || problem) && (
                <p role={error ? "alert" : undefined} className="text-sm text-destructive">
                  {error ?? problem}
                </p>
              )}
              <div className="flex gap-2">
                {data.testDrive ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!choice || !!busy || vehicle.locked}
                    onClick={() => choice && onTestDrive && ask("test", onTestDrive(choice))}
                  >
                    {busy === "test" ? <Spinner /> : <TimerIcon />}
                    Test drive · {data.testDrive}s
                  </Button>
                ) : null}
                <Button className="flex-1" disabled={!choice || !!problem || !!busy} onClick={() => setConfirming(true)}>
                  {busy === "buy" && <Spinner />}
                  Buy
                </Button>
              </div>
            </PanelFooter>
          </Panel>
        )}
      </div>

      {confirming && vehicle && choice && (
        <Confirm
          tone="primary"
          title={`Buy the ${vehicle.label} for ${formatMoney(vehicle.price)}?`}
          description={`Paid ${payment === "cash" ? "in cash" : "from your bank"}, in the colour you picked. It's waiting outside with your keys.`}
          confirmLabel="Buy"
          loading={busy === "buy"}
          onConfirm={() => onBuy && ask("buy", onBuy(choice, payment))}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export { VehicleShop, VehicleShopSurface, vehicleShopError }
