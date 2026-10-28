import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import {
  BeefIcon,
  CookieIcon,
  CupSodaIcon,
  FuelIcon,
  LandmarkIcon,
  type IconComponent,
  PackageIcon,
  SandwichIcon,
  SettingsIcon,
  ShoppingCartIcon,
  StoreIcon,
  WalletIcon,
  WrenchIcon,
  CogIcon,
} from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { EmptyState } from "@/components/ui/empty-state"
import { ItemSlot } from "@/components/ui/item-slot"
import { MenuRow } from "@/components/ui/menu-row"
import { Money, useFormatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type {
  StorefrontAnswer,
  StorefrontData,
  StorefrontIcon,
  StorefrontLine,
  StorefrontManage,
  StorefrontPayment,
  StorefrontProduct,
} from "./nui"

/**
 * Storefront — the counter of a player-run business: its name and whether it's open, products at
 * the business's prices and stock, a cart, and checkout from cash or bank with a confirm. Its
 * employees get a Manage tab: open or close, set a price within its range, switch a product on or
 * off, restock from what they carry. The page checks the cart before it asks; the server prices
 * every line and checks every action. Built from the kit: Panel (with a tabs header), ItemSlot,
 * Money, MenuRow (steppers, a checkbox), Confirm, EmptyState, with stock shadcn Tabs, Button, Spinner.
 *
 *   <StorefrontSurface />                                        // wired: nk.surface('storefront', …) opens it
 *   <Storefront data={data} onBuy={…} onManage={…} onClose={…} /> // a still, or your own wiring
 *
 * Escape goes through the surface (escape = 'back'): it closes the confirm first, then the counter.
 */
function StorefrontSurface() {
  const store = useSurface("storefront")
  const back = React.useRef<() => void>(() => store.close())
  const didntAnswer: StorefrontAnswer = { ok: false, error: "The business didn't answer. Try again." }
  return (
    <Surface name="storefront" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <Storefront
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => store.close()}
            onBuy={(items, payment) => fetchNui("storefront:buy", { items, payment }).catch(() => didntAnswer)}
            onManage={(req) => fetchNui("storefront:manage", req).catch(() => didntAnswer)}
          />
        ) : null
      }
    </Surface>
  )
}

const ICONS: Record<StorefrontIcon, IconComponent> = {
  burger: BeefIcon,
  drink: CupSodaIcon,
  fries: SandwichIcon,
  dessert: CookieIcon,
  part: CogIcon,
  tool: WrenchIcon,
  fuel: FuelIcon,
  box: PackageIcon,
}

const PAYMENT: Record<StorefrontPayment, { label: string; icon: IconComponent; short: string }> = {
  cash: { label: "Cash", icon: WalletIcon, short: "cash" },
  bank: { label: "Bank", icon: LandmarkIcon, short: "money in the bank" },
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** The cart: product id → how many. */
type StorefrontCart = Record<string, number>

/** The most of `product` one order can take: its stock, its max, never more than 99; 0 when it's off sale. */
function sfLimit(product: StorefrontProduct) {
  if (!product.enabled) return 0
  return Math.max(0, Math.min(product.stock ?? Infinity, product.max ?? Infinity, 99))
}

/** `cart` with `delta` more (or fewer) of `product`, kept between 0 and its limit. */
function sfAdd(cart: StorefrontCart, product: StorefrontProduct, delta: number): StorefrontCart {
  const next = Math.max(0, Math.min(sfLimit(product), (cart[product.id] ?? 0) + delta))
  const { [product.id]: _, ...rest } = cart
  return next > 0 ? { ...rest, [product.id]: next } : rest
}

/** The cart's lines, in menu order, for products that still exist. */
function sfLines(products: StorefrontProduct[], cart: StorefrontCart): StorefrontLine[] {
  return products.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => ({ id: p.id, count: cart[p.id]! }))
}

function sfTotal(products: StorefrontProduct[], cart: StorefrontCart) {
  return products.reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.price, 0)
}

/** `product`'s price moved by `delta`, kept inside its range (at least 1 when it has none). */
function sfClampPrice(product: StorefrontProduct, delta: number) {
  return Math.max(product.minPrice ?? 1, Math.min(product.maxPrice ?? Infinity, product.price + delta))
}

/** What's wrong with checking out now, in plain words, or null. The server checks it all again. */
function sfCartError(
  products: StorefrontProduct[],
  cart: StorefrontCart,
  payment: StorefrontPayment,
  wallet: StorefrontData["wallet"],
  open: boolean,
): string | null {
  const lines = sfLines(products, cart)
  if (!lines.length) return "Your cart is empty."
  if (!open) return "Closed right now."
  for (const { id, count } of lines) {
    const p = products.find((x) => x.id === id)!
    if (!p.enabled) return `${p.label} isn't on sale.`
    if (p.stock !== undefined && count > p.stock) return p.stock ? `Only ${p.stock} ${p.label} left.` : `${p.label} is sold out.`
    if (p.max !== undefined && count > p.max) return `You can buy at most ${p.max} ${p.label} at once.`
  }
  if (sfTotal(products, cart) > (wallet[payment] ?? 0)) return `You don't have enough ${PAYMENT[payment].short}.`
  return null
}

function Storefront({
  data,
  onBuy,
  onManage,
  onClose,
  onBack,
  autoFocus = true,
  defaultCart = {},
  defaultTab = "shop",
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: StorefrontData
  /** Ask Lua to buy; resolve with its answer. */
  onBuy?: (items: StorefrontLine[], payment: StorefrontPayment) => Promise<StorefrontAnswer> | void
  /** Ask Lua for a manage action (staff); resolve with its answer. */
  onManage?: (req: StorefrontManage) => Promise<StorefrontAnswer> | void
  onClose?: () => void
  /** Gives the surface what Escape should do now (close the confirm, else the counter). */
  onBack?: (fn: () => void) => void
  /** Focus the first product when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** A cart to start with (stills). */
  defaultCart?: StorefrontCart
  /** Start on this tab (stills). */
  defaultTab?: "shop" | "manage"
  /** Start with the confirm open (stills). */
  confirming?: boolean
}) {
  const fmt = useFormatMoney()
  const products = list(data.products)
  const payments = list(data.payment).length ? list(data.payment) : (["cash"] as StorefrontPayment[])
  const staff = !!data.staff
  const [tab, setTab] = React.useState<"shop" | "manage">(staff ? defaultTab : "shop")
  const [cart, setCart] = React.useState<StorefrontCart>(defaultCart)
  const [payment, setPayment] = React.useState<StorefrontPayment>(payments[0]!)
  const [confirming, setConfirming] = React.useState(!!confirmingProp)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [restock, setRestock] = React.useState(10)
  const grid = React.useRef<HTMLDivElement>(null)

  const lines = sfLines(products, cart)
  const total = sfTotal(products, cart)
  const problem = sfCartError(products, cart, payment, data.wallet ?? {}, data.open)
  const count = lines.reduce((n, l) => n + l.count, 0)

  // Escape: the confirm first, then the counter.
  React.useEffect(() => {
    onBack?.(() => (confirming ? setConfirming(false) : onClose?.()))
  }, [confirming, onBack, onClose])

  React.useEffect(() => {
    if (!autoFocus || tab !== "shop") return
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

  // One manage action at a time; Lua answers and sends a fresh snapshot.
  const manage = (req: StorefrontManage) => {
    if (!onManage || busy) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onManage(req))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
      })
      .finally(() => setBusy(false))
  }

  return (
    <div data-slot="storefront" className={cn("absolute inset-0 grid place-items-center p-6", className)} {...props}>
      <Panel size="auto" className="nk-enter max-w-full">
        <PanelHeader
          icon={<StoreIcon />}
          title={data.title}
          description={data.description}
          actions={
            <span className="flex items-center gap-3 text-(length:--nk-text-label)">
              <span className={cn("nk-text-caption", data.open ? "text-foreground" : "text-destructive")}>{data.open ? "Open" : "Closed"}</span>
              {payments.map((p) => {
                const Icon = PAYMENT[p].icon
                return (
                  <span key={p} className="flex items-center gap-(--nk-space-2) text-muted-foreground [&_svg]:size-3.5" title={PAYMENT[p].label}>
                    <Icon />
                    <Money amount={data.wallet?.[p] ?? 0} className="text-foreground" />
                  </span>
                )
              })}
            </span>
          }
          tabs={
            staff ? (
              <Tabs value={tab} onValueChange={(v) => setTab(v as "shop" | "manage")}>
                <TabsList>
                  <TabsTrigger value="shop">Shop</TabsTrigger>
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : undefined
          }
        />
        {tab === "shop" ? (
          <div className="grid grid-cols-[30rem_20rem]">
            <PanelBody scroll className="h-[26rem]">
              {products.length ? (
                <div ref={grid} onKeyDown={onGridKeyDown} className="grid grid-cols-5 gap-2 p-1">
                  {products.map((p) => {
                    const Icon = ICONS[p.icon as StorefrontIcon] ?? PackageIcon
                    const soldOut = p.stock === 0
                    return (
                      <ItemSlot
                        key={p.id}
                        image={p.image || <Icon className="size-7 text-muted-foreground" />}
                        label={p.label}
                        price={<Money amount={p.price} />}
                        stock={p.stock !== undefined ? (soldOut ? "Sold out" : `${p.stock} left`) : undefined}
                        active={(cart[p.id] ?? 0) > 0}
                        locked={!data.open || soldOut}
                        onClick={() => setCart((c) => sfAdd(c, p, 1))}
                      />
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={<StoreIcon />} title="Nothing for sale" description="Check back later." />
              )}
            </PanelBody>
            <div data-slot="storefront-cart" className="flex min-h-0 flex-col border-l">
              <p className="nk-text-caption flex items-center gap-(--nk-space-2) px-4 pt-3 pb-1 [&_svg]:size-3.5">
                <ShoppingCartIcon /> Cart
                {count > 0 && <span className="nk-text-num ml-auto text-foreground">{count}</span>}
              </p>
              <PanelBody scroll className="h-[21.5rem]">
                {lines.length ? (
                  lines.map(({ id, count: n }) => {
                    const p = products.find((x) => x.id === id)!
                    return (
                      <MenuRow key={id} description={<Money amount={p.price * n} />} value={`× ${n}`} onStep={(dir) => setCart((c) => sfAdd(c, p, dir))}>
                        {p.label}
                      </MenuRow>
                    )
                  })
                ) : (
                  <EmptyState icon={<ShoppingCartIcon />} title="Your cart is empty" description="Click a product to add it. Click again for more." />
                )}
              </PanelBody>
            </div>
          </div>
        ) : (
          <PanelBody scroll className="h-[26rem] w-[50rem] max-w-full">
            <MenuRow icon={<StoreIcon />} checked={data.open} onCheckedChange={(open) => manage({ action: "open", open })}>
              Open for business
            </MenuRow>
            <MenuRow
              icon={<PackageIcon />}
              description="How many to move from your inventory"
              value={restock}
              onStep={(dir) => setRestock((n) => Math.max(5, Math.min(100, n + dir * 5)))}
            >
              Restock amount
            </MenuRow>
            {products.map((p) => (
              <MenuRow
                key={p.id}
                icon={<SettingsIcon />}
                description={`${p.enabled ? "On sale" : "Hidden"} · ${p.stock === undefined ? "unlimited" : `${p.stock} in stock`} · you carry ${p.have ?? 0}`}
                value={<Money amount={p.price} />}
                onStep={(dir) => {
                  const price = sfClampPrice(p, dir)
                  if (price !== p.price) manage({ action: "price", product: p.id, price })
                }}
                actions={
                  <>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => manage({ action: "enabled", product: p.id, enabled: !p.enabled })}>
                      {p.enabled ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !p.have || p.stock === undefined}
                      onClick={() => manage({ action: "restock", product: p.id, count: Math.min(restock, p.have ?? 0) })}
                    >
                      Restock
                    </Button>
                  </>
                }
              >
                {p.label}
              </MenuRow>
            ))}
          </PanelBody>
        )}
        <PanelFooter className="flex items-center gap-3">
          {tab === "shop" && payments.length > 1 && (
            <Tabs value={payment} onValueChange={(v) => setPayment(v as StorefrontPayment)}>
              <TabsList>
                {payments.map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {PAYMENT[p].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <p
            role={error ? "alert" : undefined}
            className={cn(
              "min-w-0 flex-1 truncate text-(length:--nk-text-label)",
              error || (tab === "shop" && (lines.length || !data.open) && problem) ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {error ??
              (tab === "manage" ? "Prices stay within the range the business allows." : (lines.length || !data.open ? problem : null)) ??
              `Paying with ${PAYMENT[payment].label.toLowerCase()}`}
          </p>
          {tab === "shop" && (
            <>
              <Money amount={total} size="sm" />
              <Button disabled={!!problem || busy} onClick={() => setConfirming(true)}>
                {busy && <Spinner />}
                Checkout
              </Button>
            </>
          )}
          {tab === "manage" && busy && <Spinner />}
        </PanelFooter>
      </Panel>

      {confirming && (
        <Confirm
          tone="primary"
          title={`Buy ${count} ${count === 1 ? "item" : "items"} for ${fmt(total)}?`}
          description={`Paid ${payment === "cash" ? "in cash" : "from your bank"} to ${data.title}. ${lines
            .map((l) => `${l.count} × ${products.find((p) => p.id === l.id)!.label}`)
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

export { Storefront, StorefrontSurface, sfAdd, sfCartError, sfClampPrice, sfLimit, sfLines, sfTotal, type StorefrontCart }
