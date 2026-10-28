import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { BookUserIcon, ChevronLeftIcon, MessageSquareIcon, PlusIcon, SendIcon, UserIcon, type IconComponent } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { TextField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MenuRow } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"

import type { PhoneAnswer, PhoneData, PhoneThread } from "./nui"

/**
 * Phone — a shell anchored bottom right: a status bar (time, signal), a home screen of app icons,
 * and an app frame with a back action. Two apps ship: Contacts (a list of rows, add one with a name
 * and a number) and Messages (the threads, a thread, send a text). The page checks what it can so
 * the player sees what's wrong before asking; the server owns the number, the contacts and the
 * messages, and stamps who sent a text and when. Built from the kit: Panel, MenuRow, TextField,
 * EmptyState, with stock shadcn Button, Input and Spinner.
 *
 *   <PhoneSurface />                                   // wired: nk.surface('phone', …) in Lua opens it
 *   <Phone data={data} onSend={…} onAddContact={…} />  // a still, or your own wiring
 *
 * Escape goes through the surface (escape = 'back'): out of a thread, out of an app, then closes.
 *
 * APPS are a registry: a list of { id, label, icon, Component }. Add yours next to PHONE_APPS (or
 * pass `apps` to <Phone />); see "Adding an app" in the template's README. An app gets the data,
 * `open(appId, params)` to jump to another app, and `setBack(fn | null)` to take over Back while it
 * shows an inner view (null gives it back to the phone, which then goes home).
 */
function PhoneSurface() {
  const phone = useSurface("phone")
  const back = React.useRef<() => void>(() => phone.close())
  return (
    <Surface name="phone" layer="panel" escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <Phone
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => phone.close()}
            onAddContact={(name, number) => fetchNui("phone:addContact", { name, number }).catch(unanswered)}
            onSend={(to, text) => fetchNui("phone:send", { to, text }).catch(unanswered)}
          />
        ) : null
      }
    </Surface>
  )
}

const unanswered = (): PhoneAnswer => ({ ok: false, error: "The network didn't answer. Try again." })

// ───────────────────────────────── pure helpers (tested in phone.test.ts)

/** Only the digits of what the player typed ("555-0142" → "5550142"). */
const phoneDigits = (s: string) => s.replace(/\D/g, "")

/** "5550142" → "555-0142". Anything shorter is shown as it is. */
const formatPhone = (n: string) => (/^\d{5,}$/.test(n) ? `${n.slice(0, -4)}-${n.slice(-4)}` : n)

const pad = (n: number) => String(n).padStart(2, "0")

/** Unix seconds → "18:05", on the player's clock. */
const formatTime = (sec: number) => {
  const d = new Date(sec * 1000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** `data` with its lists as arrays, however Lua encoded them. */
const normalize = (d: PhoneData): PhoneData => ({
  ...d,
  contacts: list(d.contacts),
  threads: list(d.threads).map((t) => ({ ...t, messages: list(t.messages) })),
})

/** Used until the server's `limits` say otherwise. */
const LIMITS = { name: 24, text: 240 }

/** The name saved under `number`, or the number itself. */
const contactName = (data: PhoneData, number: string) => data.contacts.find((c) => c.number === number)?.name ?? formatPhone(number)

/** Threads with the newest message first. */
const sortThreads = (threads: PhoneThread[]) => {
  const last = (t: PhoneThread) => t.messages[t.messages.length - 1]?.time ?? 0
  return [...threads].sort((a, b) => last(b) - last(a))
}

/** What's wrong with saving this contact, in plain words, or null. The server checks it all again. */
function contactError(data: PhoneData, name: string, number: string): string | null {
  const limit = data.limits?.name ?? LIMITS.name
  if (!name.trim()) return "Enter a name."
  if (name.trim().length > limit) return `Names are up to ${limit} characters.`
  const digits = phoneDigits(number)
  // Every number is as long as the player's own.
  if (digits.length !== data.number.length) return `Numbers have ${data.number.length} digits.`
  if (digits === data.number) return "That's your own number."
  if (data.contacts.some((c) => c.number === digits)) return `${contactName(data, digits)} is already saved.`
  return null
}

/** What's wrong with sending this text, or null. */
function messageError(data: PhoneData, text: string): string | null {
  const limit = data.limits?.text ?? LIMITS.text
  if (!text.trim()) return "Write something first."
  if (text.trim().length > limit) return `Texts are up to ${limit} characters.`
  return null
}

// ───────────────────────────────── apps

interface PhoneAppProps {
  data: PhoneData
  /** Ask the server to add a contact; resolve with its answer. */
  onAddContact?: (name: string, number: string) => Promise<PhoneAnswer> | void
  /** Ask the server to send a text; the server stamps the sender and the time. */
  onSend?: (to: string, text: string) => Promise<PhoneAnswer> | void
  /** Jump to another app (Contacts opens Messages at a number). */
  open: (appId: string, params?: Record<string, string>) => void
  /** What the app was opened with. */
  params?: Record<string, string>
  /** Take over Back while the app shows an inner view; null hands it back. */
  setBack: (fn: (() => void) | null) => void
}

interface PhoneApp {
  id: string
  label: string
  icon: IconComponent
  Component: React.ComponentType<PhoneAppProps>
}

/** The answer's error, or null when it went through (or there was nothing to ask). */
const answerError = (a: PhoneAnswer | void) => (a && !a.ok ? (a.error ?? "That didn't go through.") : null)

function ContactsApp({ data, onAddContact, open, setBack }: PhoneAppProps) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [number, setNumber] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    setBack(adding ? () => setAdding(false) : null)
    return () => setBack(null)
  }, [adding, setBack])

  const problem = contactError(data, name, number)
  const save = () => {
    if (problem || busy || !onAddContact) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onAddContact(name.trim(), phoneDigits(number)))
      .then((a) => {
        const e = answerError(a)
        if (e) return setError(e)
        setName("")
        setNumber("")
        setAdding(false)
      })
      .finally(() => setBusy(false))
  }

  if (adding)
    return (
      <form
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <TextField label="Name" value={name} onValueChange={setName} maxLength={data.limits?.name ?? LIMITS.name} inputProps={{ autoFocus: true }} />
        <TextField label="Number" value={number} onValueChange={setNumber} placeholder={formatPhone(data.number)} />
        <p role={error ? "alert" : undefined} className={cn("min-h-5 text-(length:--nk-text-label)", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? (name || number ? problem : null) ?? ""}
        </p>
        <Button type="submit" disabled={!!problem || busy}>
          {busy && <Spinner />}
          Save contact
        </Button>
      </form>
    )

  return (
    <PanelBody scroll className="flex-1">
      <MenuRow icon={<PlusIcon />} onClick={() => setAdding(true)}>
        Add contact
      </MenuRow>
      {data.contacts.length ? (
        data.contacts.map((c) => (
          <MenuRow key={c.number} icon={<UserIcon />} description={formatPhone(c.number)} chevron onClick={() => open("messages", { number: c.number })}>
            {c.name}
          </MenuRow>
        ))
      ) : (
        <EmptyState icon={<BookUserIcon />} title="No contacts yet" description="Add a name and a number to message them." />
      )}
      <MenuRow readOnly meta={formatPhone(data.number)}>
        My number
      </MenuRow>
    </PanelBody>
  )
}

function MessagesApp({ data, onSend, params, setBack }: PhoneAppProps) {
  const [number, setNumber] = React.useState<string | null>(params?.number ?? null)
  const [text, setText] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const end = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setBack(number ? () => setNumber(null) : null)
    return () => setBack(null)
  }, [number, setBack])

  const thread = data.threads.find((t) => t.number === number)
  const count = thread?.messages.length ?? 0
  React.useEffect(() => end.current?.scrollIntoView({ block: "end" }), [number, count])

  if (!number) {
    const threads = sortThreads(data.threads)
    return (
      <PanelBody scroll className="flex-1">
        {threads.length ? (
          threads.map((t) => {
            const last = t.messages[t.messages.length - 1]
            return (
              <MenuRow key={t.number} icon={<UserIcon />} description={last?.text} meta={last ? formatTime(last.time) : undefined} onClick={() => setNumber(t.number)}>
                {contactName(data, t.number)}
              </MenuRow>
            )
          })
        ) : (
          <EmptyState icon={<MessageSquareIcon />} title="No messages" description="Open a contact to send the first one." />
        )}
      </PanelBody>
    )
  }

  const problem = messageError(data, text)
  const send = () => {
    if (problem || busy || !onSend) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onSend(number, text.trim()))
      .then((a) => {
        const e = answerError(a)
        if (e) setError(e)
        else setText("")
      })
      .finally(() => setBusy(false))
  }

  return (
    <>
      <p className="nk-caption px-4 pt-3 pb-1">{contactName(data, number)}</p>
      <PanelBody scroll className="flex-1">
        <div className="flex flex-col gap-(--nk-space-2) px-3 py-2">
          {(thread?.messages ?? []).map((m, i) => (
            <div key={i} className={cn("flex max-w-[80%] flex-col gap-(--nk-space-1)", m.from === "me" ? "items-end self-end" : "items-start self-start")}>
              <p className={cn("rounded-(--nk-radius-control) px-3 py-(--nk-space-2) text-(length:--nk-text-label) break-words", m.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{m.text}</p>
              <span className="nk-num text-(length:--nk-text-label) text-muted-foreground">{formatTime(m.time)}</span>
            </div>
          ))}
          <div ref={end} />
        </div>
      </PanelBody>
      {error && (
        <p role="alert" className="px-4 pb-2 text-(length:--nk-text-label) text-destructive">
          {error}
        </p>
      )}
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" maxLength={data.limits?.text ?? LIMITS.text} autoFocus aria-label="Message" />
        <Button type="submit" size="icon" disabled={!!problem || busy} aria-label="Send">
          {busy ? <Spinner /> : <SendIcon />}
        </Button>
      </form>
    </>
  )
}

/**
 * The installed apps, in home-screen order. To add one, append { id, label, icon, Component }: the
 * Component gets PhoneAppProps and talks to your Lua with its own fetchNui callback.
 */
const PHONE_APPS: PhoneApp[] = [
  { id: "contacts", label: "Contacts", icon: BookUserIcon, Component: ContactsApp },
  { id: "messages", label: "Messages", icon: MessageSquareIcon, Component: MessagesApp },
]

// ───────────────────────────────── the shell

/** Four bars, `bars` of them lit. */
function Signal({ bars }: { bars: number }) {
  return (
    <span role="img" aria-label={`${bars} of 4 signal bars`} className="flex items-end gap-(--nk-space-1)">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ height: `${0.25 + i * 0.15}rem` }} className={cn("w-[0.2rem] rounded-(--nk-radius-key) bg-foreground", i > bars && "opacity-30")} />
      ))}
    </span>
  )
}

function Phone({
  data: raw,
  apps = PHONE_APPS,
  onAddContact,
  onSend,
  onClose,
  onBack,
  defaultApp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: PhoneData
  /** The installed apps (default: Contacts and Messages). */
  apps?: PhoneApp[]
  onAddContact?: PhoneAppProps["onAddContact"]
  onSend?: PhoneAppProps["onSend"]
  onClose?: () => void
  /** Gives the surface what Escape should do now (out of the view, out of the app, close). */
  onBack?: (fn: () => void) => void
  /** Start inside an app (stills). */
  defaultApp?: { id: string; params?: Record<string, string> }
}) {
  const data = React.useMemo(() => normalize(raw), [raw])
  const [current, setCurrent] = React.useState<{ id: string; params?: Record<string, string> } | null>(defaultApp ?? null)
  const [now, setNow] = React.useState(() => Date.now())
  const appBack = React.useRef<(() => void) | null>(null)
  const setBack = React.useCallback((fn: (() => void) | null) => void (appBack.current = fn), [])

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  const app = apps.find((a) => a.id === current?.id)
  // Back: the app's inner view first, then the app, then the phone.
  const goBack = React.useCallback(() => {
    if (appBack.current) appBack.current()
    else if (app) setCurrent(null)
    else onClose?.()
  }, [app, onClose])
  React.useEffect(() => onBack?.(goBack), [goBack, onBack])

  const App = app?.Component
  return (
    <div data-slot="phone" className={cn("absolute right-6 bottom-6", className)} {...props}>
      <Panel size="auto" className="nk-enter h-[34rem] w-80">
        <div data-slot="phone-status" className="nk-num flex shrink-0 items-center justify-between px-4 pt-2 pb-1 text-(length:--nk-text-label) text-muted-foreground">
          <span>{formatTime(now / 1000)}</span>
          <Signal bars={Math.max(0, Math.min(4, data.signal ?? 4))} />
        </div>
        {App && app ? (
          <>
            <PanelHeader
              icon={
                <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
                  <ChevronLeftIcon />
                </Button>
              }
              title={app.label}
            />
            <App
              key={app.id}
              data={data}
              onAddContact={onAddContact}
              onSend={onSend}
              params={current?.params}
              open={(id, params) => setCurrent({ id, params })}
              setBack={setBack}
            />
          </>
        ) : (
          <div data-slot="phone-home" className="grid grid-cols-4 content-start gap-2 p-4">
            {apps.map((a) => (
              <Button key={a.id} variant="ghost" className="h-auto flex-col gap-(--nk-space-2) px-1 py-3 text-(length:--nk-text-label) [&_svg]:size-6" onClick={() => setCurrent({ id: a.id })}>
                <a.icon />
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

export { Phone, PhoneSurface, PHONE_APPS, contactError, contactName, formatPhone, formatTime, messageError, phoneDigits, sortThreads, type PhoneApp, type PhoneAppProps }
