import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import { RotateCcwIcon, SettingsIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Kbd } from "@/components/ui/kbd"
import { MenuRow } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { SliderField } from "@/components/ui/form-field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { SettingsData, SettingsItem, SettingsSection, SettingsSlider, SettingsValue } from "./nui"

/**
 * Settings — the player's settings for your server in one panel: toggles, choices, sliders and key
 * hints, grouped in sections (tabs). Every change goes to Lua (`settings:change`) and the row shows
 * what Lua answers, so Lua can clamp or refuse a value. Sliders send once, when let go. Built from the
 * kit: Panel, MenuRow (checkbox, stepper and read-only key rows), SliderField (form-field), EmptyState,
 * with stock shadcn Tabs and Kbd.
 *
 *   <SettingsSurface />                                    // wired: nk.surface('settings', …) in Lua opens it
 *   <Settings data={data} onChange={…} />                  // a still, or your own wiring
 *
 * Keys: Up / Down move between rows, Left / Right change the value, Enter or Space toggles, Esc closes.
 */
function SettingsSurface() {
  return (
    <Surface name="settings" layer="panel" exclusive>
      {(data) =>
        data ? (
          <div className="nk-edge absolute inset-0">
            <div className="nk-anchor-r">
              <Settings
                data={data}
                onChange={async (id, value) => (await fetchNui("settings:change", { id, value }).catch(() => ({ ok: false, value: undefined }))).value}
                onReset={async () => (await fetchNui("settings:reset").catch(() => ({ ok: false, sections: undefined }))).sections}
              />
            </div>
          </div>
        ) : null
      }
    </Surface>
  )
}

const itemValues = (sections: SettingsSection[]) => {
  const out: Record<string, SettingsValue> = {}
  for (const s of sections) for (const i of s.items) if (i.type !== "key") out[i.id] = i.value
  return out
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function Settings({
  data,
  onChange,
  onReset,
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Panel>, "children" | "onChange"> & {
  data: SettingsData
  /** Focus the first row when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Send a change; resolve with the value it now has (undefined: keep what the player picked). */
  onChange?: (id: string, value: SettingsValue) => Promise<SettingsValue | undefined> | void
  /** Reset to defaults; resolve with the new sections (undefined: keep the current ones). */
  onReset?: () => Promise<SettingsSection[] | undefined> | void
}) {
  const [sections, setSections] = React.useState(() => list(data.sections))
  const [values, setValues] = React.useState(() => itemValues(list(data.sections)))
  const [tab, setTab] = React.useState(() => list(data.sections)[0]?.id ?? "")
  const body = React.useRef<HTMLDivElement>(null)

  // A new snapshot from Lua (surface:update) replaces what's shown.
  React.useEffect(() => {
    const next = list(data.sections)
    setSections(next)
    setValues(itemValues(next))
    setTab((t) => (next.some((s) => s.id === t) ? t : (next[0]?.id ?? "")))
  }, [data])

  const set = (id: string, value: SettingsValue, send = true) => {
    setValues((v) => ({ ...v, [id]: value }))
    if (!send || !onChange) return
    void Promise.resolve(onChange(id, value)).then((answer) => {
      if (answer !== undefined) setValues((v) => ({ ...v, [id]: answer }))
    })
  }

  const reset = () =>
    void Promise.resolve(onReset?.()).then((next) => {
      if (!next) return
      setSections(list(next))
      setValues(itemValues(list(next)))
    })

  /** The interactive rows and the sliders' thumbs, in order. */
  const navRows = () =>
    [...(body.current?.querySelectorAll<HTMLElement>("[data-nav], [data-settings-slider] [role=slider]") ?? [])].filter(
      (el) => el.tabIndex >= 0 && el.getAttribute("aria-disabled") !== "true" && !(el as HTMLButtonElement).disabled
    )

  // Up / Down move between rows. Captured first, so a focused slider doesn't take them as +/-.
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
    if (!dir) return
    const rows = navRows()
    if (!rows.length) return
    e.preventDefault()
    e.stopPropagation()
    const i = rows.indexOf(document.activeElement as HTMLElement)
    rows[(i + dir + rows.length) % rows.length]?.focus()
  }

  const current = sections.find((s) => s.id === tab) ?? sections[0]
  const changeable = list(current?.items).some((i) => i.type !== "key")

  // The first row takes the keyboard when the panel opens and when the section changes.
  // (After the event that switched tabs, which focuses its tab on the way.)
  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => navRows()[0]?.focus(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, current?.id])

  return (
    <Panel size="lg" className={className} {...props}>
      <PanelHeader
        icon={<SettingsIcon />}
        title={data.title ?? "Settings"}
        description={data.description}
        tabs={
          sections.length > 1 ? (
            <Tabs value={current?.id} onValueChange={setTab}>
              <TabsList className="w-full">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    {s.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : undefined
        }
      />
      <PanelBody scroll className="max-h-[26rem]">
        <div ref={body} className="flex flex-col gap-(--nk-space-1)" onKeyDownCapture={onKeyDownCapture}>
          {current ? (
            list(current.items).map((item) => <SettingsRow key={item.id} item={item} value={values[item.id]} onValue={set} />)
          ) : (
            <EmptyState icon={<SettingsIcon />} title="No settings yet" description="This server hasn't added any. Check back after the next update." />
          )}
        </div>
      </PanelBody>
      <PanelFooter className="nk-text-label">
        {changeable && (
          <>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Move
            <Kbd className="ml-2">←</Kbd>
            <Kbd>→</Kbd>
            Change
          </>
        )}
        {data.resettable ? (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
            <RotateCcwIcon />
            Reset
          </Button>
        ) : (
          <>
            <Kbd className="ml-auto">Esc</Kbd>
            Close
          </>
        )}
      </PanelFooter>
    </Panel>
  )
}

function SettingsRow({
  item,
  value,
  onValue,
}: {
  item: SettingsItem
  value: SettingsValue | undefined
  onValue: (id: string, value: SettingsValue, send?: boolean) => void
}) {
  switch (item.type) {
    case "toggle":
      return (
        <MenuRow
          data-nav
          description={item.description}
          disabled={item.disabled}
          checked={value === true}
          onCheckedChange={(on) => onValue(item.id, on)}
        >
          {item.label}
        </MenuRow>
      )
    case "choice": {
      const options = list(item.options)
      const at = Math.max(0, options.findIndex((o) => o.value === value))
      return (
        <MenuRow
          data-nav
          description={item.description}
          disabled={item.disabled}
          value={options[at]?.label ?? "—"}
          onStep={(dir) => {
            const next = options[(at + dir + options.length) % options.length]
            if (next) onValue(item.id, next.value)
          }}
        >
          {item.label}
        </MenuRow>
      )
    }
    case "slider":
      return <SettingsSliderRow item={item} value={typeof value === "number" ? value : item.value} onValue={onValue} />
    case "key":
      // shown, not used: the key is bound in game (Settings > Key bindings), so the row is read-only
      return (
        <MenuRow data-settings-key readOnly description={item.description} kbd={item.key}>
          {item.label}
        </MenuRow>
      )
  }
}

/**
 * The kit's SliderField (form-field): label, the value with its unit, the slider. It moves as the
 * player drags, and sends once, when let go: on pointer-up or key-up, and only when the value changed
 * since the last send (as the slider's own commit did), so Lua gets the same messages as before.
 */
function SettingsSliderRow({
  item,
  value,
  onValue,
}: {
  item: SettingsSlider
  value: number
  onValue: (id: string, value: SettingsValue, send?: boolean) => void
}) {
  const latest = React.useRef(value)
  latest.current = value
  const sent = React.useRef(value)
  const commit = () => {
    if (latest.current === sent.current) return
    sent.current = latest.current
    onValue(item.id, latest.current)
  }
  return (
    <div data-settings-slider className="px-3 py-2" onPointerUp={commit} onKeyUp={commit}>
      <SliderField
        label={item.label}
        description={item.description}
        min={item.min}
        max={item.max}
        step={item.step ?? 1}
        value={value}
        disabled={item.disabled}
        format={(v) => `${v}${item.unit ?? ""}`}
        onValueChange={(v) => onValue(item.id, v, false)}
      />
    </div>
  )
}

export { Settings, SettingsSurface }
