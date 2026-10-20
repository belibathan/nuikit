import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import {
  BandageIcon,
  BatteryFullIcon,
  CoffeeIcon,
  CookieIcon,
  CupSodaIcon,
  FlashlightIcon,
  FuelIcon,
  KeyRoundIcon,
  LandmarkIcon,
  type LucideIcon,
  PackageIcon,
  RadioIcon,
  SandwichIcon,
  ShirtIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { EmptyState } from "@/components/ui/empty-state"
import { ItemSlot } from "@/components/ui/item-slot"
import { MenuRow } from "@/components/ui/menu-row"
import { Money, formatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { ShopAnswer, ShopData, ShopIcon, ShopItem, ShopLine, ShopPayment } from "./nui"

/**
 * Shop — a catalogue grid by category, a cart, and checkout with a confirm. The page checks the
 * cart before it asks (stock, the most per purchase, what the player has); Lua and the server
 * decide. Built from the kit: Panel (with a tabs header), ItemSlot, Money, MenuRow (steppers),
 * Confirm, EmptyState, with stock shadcn Tabs, Button and Spinner.
 *
 *   <ShopSurface />                                  // wired: nk.surface('shop', …) in Lua opens it
 *   <Shop data={data} onBuy={…} onClose={…} />       // a still, or your own wiring
 *
 * Escape goes through the surface (escape = 'back'): it closes the confirm first, then the shop.
 */
function ShopSurface() {
  const shop = useSurface("shop")
  const back = React.useRef<() => void>(() => shop.close())
  return (
    <Surface name="shop" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <Shop
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => shop.close()}
            onBuy={(items, payment) =>
              fetchNui("shop:buy", { items, payment }).catch(() => ({ ok: false, error: "The shop didn't answer. Try again." }))
            }
          />
        ) : null
      }
    </Surface>
  )
}

const ICONS: Record<ShopIcon, LucideIcon> = {
  drink: CupSodaIcon,
  coffee: CoffeeIcon,
  food: SandwichIcon,
  snack: CookieIcon,
  phone: SmartphoneIcon,
  radio: RadioIcon,
  medical: BandageIcon,
  tool: WrenchIcon,
  key: KeyRoundIcon,
  box: PackageIcon,
  shirt: ShirtIcon,
  fuel: FuelIcon,
  light: FlashlightIcon,
  battery: BatteryFullIcon,
}

const PAYMENT: Record<ShopPayment, { label: string; icon: LucideIcon; short: string }> = {
  cash: { label: "Cash", icon: WalletIcon, short: "cash" },
  bank: { label: "Bank", icon: LandmarkIcon, short: "money in the bank" },
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** The cart: item id → how many. */
type ShopCart = Record<string, number>

/** The most of `item` one purchase can take: its stock, its max, and never more than 99. */
function shopLimit(item: ShopItem) {
  return Math.max(0, Math.min(item.stock ?? Infinity, item.max ?? Infinity, 99))
}

/** `cart` with `delta` more (or fewer) of `item`, kept between 0 and its limit. */
function shopAdd(cart: ShopCart, item: ShopItem, delta: number): ShopCart {
  const next = Math.max(0, Math.min(shopLimit(item), (cart[item.id] ?? 0) + delta))
  const { [item.id]: _, ...rest } = cart
  return next > 0 ? { ...rest, [item.id]: next } : rest
}

/** The cart's lines, in catalogue order, for items that still exist. */
function shopLines(items: ShopItem[], cart: ShopCart): ShopLine[] {
  return items.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ id: i.id, count: cart[i.id]! }))
}

function shopTotal(items: ShopItem[], cart: ShopCart) {
  return items.reduce((sum, i) => sum + (cart[i.id] ?? 0) * i.price, 0)
}

/** What's wrong with checking out now, in plain words, or null. The server checks it all again. */
function shopCartError(items: ShopItem[], cart: ShopCart, payment: ShopPayment, wallet: ShopData["wallet"]): string | null {
  const lines = shopLines(items, cart)
  if (!lines.length) return "Your cart is empty."
  for (const { id, count } of lines) {
    const item = items.find((i) => i.id === id)!
    if (item.locked) return `You can't buy ${item.label}${item.lockedReason ? `: ${item.lockedReason.toLowerCase()}.` : "."}`
    if (item.stock !== undefined && count > item.stock) return item.stock ? `Only ${item.stock} ${item.label} left.` : `${item.label} is sold out.`
    if (item.max !== undefined && count > item.max) return `You can buy at most ${item.max} ${item.label} at once.`
  }
  if (shopTotal(items, cart) > (wallet[payment] ?? 0)) return `You don't have enough ${PAYMENT[payment].short}.`
  return null
}

function Shop({
  data,
  onBuy,
  onClose,
  onBack,
  autoFocus = true,
  defaultCart = {},
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: ShopData
  /** Ask Lua to buy; resolve with its answer. */
  onBuy?: (items: ShopLine[], payment: ShopPayment) => Promise<ShopAnswer> | void
  onClose?: () => void
  /** Gives the surface what Escape should do now (close the confirm, else the shop). */
  onBack?: (fn: () => void) => void
  /** Focus the first item when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** A cart to start with (stills). */
  defaultCart?: ShopCart
  /** Start with the confirm open (stills). */
  confirming?: boolean
}) {
  const items = list(data.items)
  const categories = list(data.categories)
  const payments = list(data.payment).length ? list(data.payment) : (["cash"] as ShopPayment[])
  const [tab, setTab] = React.useState(categories[0]?.id ?? "all")
  const [cart, setCart] = React.useState<ShopCart>(defaultCart)
  const [payment, setPayment] = React.useState<ShopPayment>(payments[0]!)
  const [confirming, setConfirming] = React.useState(!!confirmingProp)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const grid = React.useRef<HTMLDivElement>(null)

  const shown = categories.length ? items.filter((i) => i.category === tab) : items
  const lines = shopLines(items, cart)
  const total = shopTotal(items, cart)
  const problem = shopCartError(items, cart, payment, data.wallet ?? {})
  const count = lines.reduce((n, l) => n + l.count, 0)

  // Escape: the confirm first, then the shop.
  React.useEffect(() => {
    onBack?.(() => (confirming ? setConfirming(false) : onClose?.()))
  }, [confirming, onBack, onClose])

  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => grid.current?.querySelector<HTMLElement>("[data-slot=item-slot][role=button]")?.focus(), 0)
    return () => clearTimeout(t)
  }, [autoFocus, tab])

  // Arrow keys move around the grid (five across).
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 5, ArrowUp: -5 }[e.key]
    if (!step || !grid.current) return
    const slots = [...grid.current.querySelectorAll<HTMLElement>("[data-slot=item-slot][role=button]")]
    const i = slots.indexOf(document.activeElement as HTMLElement)
    const next = slots[Math.max(0, Math.min(slots.length - 1, i + step))]
    if (!next) return
    e.preventDefault()
    next.focus()
  }

  const buy = () => {
    if (!onBuy || busy || problem) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onBuy(lines, payment))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
        else setCart({})
      })
      .finally(() => {
        setBusy(false)
        setConfirming(false)
      })
  }

  return (
    <div data-slot="shop" className={cn("absolute inset-0 grid place-items-center p-6", className)} {...props}>
      <Panel size="auto" className="nk-enter max-w-full">
        <PanelHeader
          icon={<ShoppingBagIcon />}
          title={data.title}
          description={data.description}
          actions={
            <span className="flex items-center gap-3 text-sm">
              {payments.map((p) => {
                const Icon = PAYMENT[p].icon
                return (
                  <span key={p} className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5" title={PAYMENT[p].label}>
                    <Icon />
                    <Money amount={data.wallet?.[p] ?? 0} className="text-foreground" />
                  </span>
                )
              })}
            </span>
          }
          tabs={
            categories.length ? (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
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
        <div className="grid grid-cols-[30rem_20rem]">
          <PanelBody scroll className="h-[26rem]">
            <div ref={grid} onKeyDown={onGridKeyDown} className="grid grid-cols-5 gap-2 p-1">
              {shown.map((item) => {
                const Icon = ICONS[item.icon as ShopIcon] ?? PackageIcon
                const soldOut = item.stock === 0
                const inCart = cart[item.id] ?? 0
                return (
                  <ItemSlot
                    key={item.id}
                    image={item.image || <Icon className="size-7 text-muted-foreground" />}
                    label={item.label}
                    price={<Money amount={item.price} />}
                    stock={item.stock !== undefined ? (soldOut ? "Sold out" : `${item.stock} left`) : undefined}
                    active={inCart > 0}
                    locked={item.locked || soldOut}
                    title={item.locked ? item.lockedReason : item.description}
                    onClick={() => setCart((c) => shopAdd(c, item, 1))}
                  />
                )
              })}
            </div>
          </PanelBody>
          <div data-slot="shop-cart" className="flex min-h-0 flex-col border-l">
            <p className="nk-label flex items-center gap-1.5 px-4 pt-3 pb-1 [&_svg]:size-3.5">
              <ShoppingCartIcon /> Cart{count > 0 && <span className="nk-num">· {count}</span>}
            </p>
            <PanelBody scroll className="h-[21.5rem]">
              {lines.length ? (
                lines.map(({ id, count: n }) => {
                  const item = items.find((i) => i.id === id)!
                  return (
                    <MenuRow
                      key={id}
                      description={<Money amount={item.price * n} />}
                      value={`× ${n}`}
                      onStep={(dir) => setCart((c) => shopAdd(c, item, dir))}
                    >
                      {item.label}
                    </MenuRow>
                  )
                })
              ) : (
                <EmptyState icon={<ShoppingCartIcon />} title="Your cart is empty" description="Click an item to add it. Click again for more." />
              )}
            </PanelBody>
          </div>
        </div>
        <PanelFooter className="flex items-center gap-3">
          {payments.length > 1 && (
            <Tabs value={payment} onValueChange={(v) => setPayment(v as ShopPayment)}>
              <TabsList>
                {payments.map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {PAYMENT[p].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <p role={error ? "alert" : undefined} className={cn("min-w-0 flex-1 truncate text-sm", error || (lines.length && problem) ? "text-destructive" : "text-muted-foreground")}>
            {error ?? (lines.length ? problem : null) ?? `Paying with ${PAYMENT[payment].label.toLowerCase()}`}
          </p>
          <Money amount={total} size="sm" />
          <Button disabled={!!problem || busy} onClick={() => setConfirming(true)}>
            {busy && <Spinner />}
            Checkout
          </Button>
        </PanelFooter>
      </Panel>

      {confirming && (
        <Confirm
          tone="primary"
          title={`Buy ${count} ${count === 1 ? "item" : "items"} for ${formatMoney(total)}?`}
          description={`Paid ${payment === "cash" ? "in cash" : "from your bank"}. ${lines
            .map((l) => `${l.count} × ${items.find((i) => i.id === l.id)!.label}`)
            .join(", ")}.`}
          confirmLabel="Buy"
          loading={busy}
          onConfirm={buy}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export { Shop, ShopSurface, shopAdd, shopCartError, shopLimit, shopLines, shopTotal, type ShopCart }
