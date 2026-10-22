import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { motionLevel } from "nuikit-core/motion"
import { MessagesSquareIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { MenuRow, MenuRowList } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"

import type { DialogueAnswer, DialogueChoice, DialogueData } from "./nui"

/**
 * NPC dialogue — talking to someone: a band at the bottom of the screen with who is speaking, the
 * line (it types itself out, all at once with reduced motion) and the replies as rows. 1–9 pick a
 * reply, the arrows and Enter too; a locked reply is dimmed with the reason as its description. The
 * page sends only the reply's id: Lua and the server hold the conversation and decide what it does.
 * Built from the kit: Panel and MenuRow.
 *
 *   <DialogueSurface />                      // wired: nk.surface('dialogue', …) in Lua opens it
 *   <NpcDialogue data={data} onChoose={…} /> // a still, or your own wiring
 *
 * Escape closes the conversation, through the surface.
 */
function DialogueSurface() {
  const dialogue = useSurface("dialogue")
  return (
    <Surface name="dialogue" layer="panel" exclusive escape="back" onBack={() => dialogue.close()}>
      {(data) =>
        data ? (
          <NpcDialogue
            data={data}
            onChoose={(choice) => fetchNui("dialogue:choose", { choice }).catch(() => ({ ok: false, error: "They didn't answer. Try again." }))}
          />
        ) : null
      }
    </Surface>
  )
}

/** The id of the reply on number key `key` ("1" is the first), or null when it's locked or isn't there. */
function dialogueChoiceAt(choices: DialogueChoice[], key: string): string | null {
  if (!/^[1-9]$/.test(key)) return null
  const c = choices[Number(key) - 1]
  return c && !c.locked ? c.id : null
}

/** The index of the next available reply from `from` in `dir`, skipping locked ones; `from` at the ends. */
function dialogueMove(choices: DialogueChoice[], from: number, dir: -1 | 1): number {
  for (let i = from + dir; i >= 0 && i < choices.length; i += dir) if (!choices[i]!.locked) return i
  return from
}

/** The first `n` characters of `text` while it types; all of it when `typing` is off. */
function dialogueRevealed(text: string, n: number, typing: boolean): string {
  return typing ? text.slice(0, n) : text
}

/** Characters per second the line types at. */
const TYPE_RATE = 45

/** How much of `text` is showing: it types out unless motion is reduced or off. `skip()` shows the rest. */
function useTypewriter(text: string) {
  const [n, setN] = React.useState(0)
  const typing = motionLevel() === "on"
  React.useEffect(() => {
    setN(0)
    if (!typing) return
    const t = setInterval(() => setN((v) => v + 1), 1000 / TYPE_RATE)
    return () => clearInterval(t)
  }, [text, typing])
  const done = !typing || n >= text.length
  return { shown: dialogueRevealed(text, n, typing), rest: typing ? text.slice(n) : "", done, skip: () => setN(text.length) }
}

function NpcDialogue({
  data,
  onChoose,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: DialogueData
  /** Ask Lua to take this reply; resolve with its answer. The surface then updates or closes. */
  onChoose?: (choice: string) => Promise<DialogueAnswer> | void
}) {
  // Lua turns an empty table into {} instead of [].
  const choices = Array.isArray(data.choices) ? data.choices : []
  const [active, setActive] = React.useState(() => dialogueMove(choices, -1, 1))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const line = useTypewriter(data.text)

  // A new line: back to the first available reply.
  React.useEffect(() => {
    setActive(dialogueMove(Array.isArray(data.choices) ? data.choices : [], -1, 1))
    setError(null)
  }, [data])

  const choose = (id: string) => {
    if (!onChoose || busy) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onChoose(id))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(false))
  }

  // Number keys, arrows and Enter. A key pressed while the line is typing shows the rest first.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const picked = dialogueChoiceAt(choices, e.key)
      if (picked) return void (e.preventDefault(), choose(picked))
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        setActive((a) => dialogueMove(choices, a, e.key === "ArrowDown" ? 1 : -1))
      } else if (e.key === "Enter") {
        const c = choices[active]
        if (c && !c.locked) (e.preventDefault(), choose(c.id))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div data-slot="npc-dialogue" className={cn("absolute inset-0 flex items-end justify-center p-6", className)} {...props}>
      <Panel size="auto" className="nk-enter w-[48rem] max-w-full">
        <PanelHeader icon={<MessagesSquareIcon />} title={data.speaker} description={data.role} />
        <PanelBody className="px-4 py-3">
          {/* The whole line is laid out from the start (the rest is invisible) so the text doesn't reflow as it types. */}
          <p aria-label={data.text} onClick={line.skip} className="min-h-[3.25rem] text-base leading-relaxed">
            <span>{line.shown}</span>
            <span aria-hidden className="invisible">
              {line.rest}
            </span>
          </p>
        </PanelBody>
        <PanelBody className="border-t p-1">
          <MenuRowList active={active}>
            {choices.map((c, i) => (
              <MenuRow
                key={c.id}
                kbd={i < 9 ? String(i + 1) : undefined}
                active={i === active}
                disabled={c.locked}
                description={c.locked ? c.lockedReason : undefined}
                onClick={() => choose(c.id)}
              >
                {c.label}
              </MenuRow>
            ))}
          </MenuRowList>
        </PanelBody>
        {error && (
          <PanelFooter>
            <p role="alert" className="truncate text-sm text-destructive">
              {error}
            </p>
          </PanelFooter>
        )}
      </Panel>
    </div>
  )
}

export { NpcDialogue, DialogueSurface, dialogueChoiceAt, dialogueMove, dialogueRevealed }
