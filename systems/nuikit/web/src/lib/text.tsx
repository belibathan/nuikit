// The little markdown scripts put in notifications and menus (ox_lib renders CommonMark there):
// [E]-style key tokens render as keycaps (components/ui/text).
// **bold**, *italic*, `code`, line breaks, and a heading line as bold. No HTML, no links to follow.
import { Fragment, type ReactNode } from "react";
import { withKeys } from "@/components/ui/text";

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}:${i}`;
    if (/^\*\*.+\*\*$|^__.+__$/.test(part)) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (/^\*.+\*$|^_.+_$/.test(part)) return <em key={k}>{part.slice(1, -1)}</em>;
    if (/^`.+`$/.test(part)) return <code key={k} className="rounded-sm bg-muted px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    return <Fragment key={k}>{withKeys(part)}</Fragment>;
  });
}

/** Render a script's text. Plain strings stay plain; nothing is parsed from the HTML side. */
export function Text({ children }: { children: string | undefined | null }): ReactNode {
  if (!children) return null;
  const lines = String(children).split(/\r?\n/);
  return lines.map((line, i) => {
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    const body = heading ? <strong>{inline(heading[1]!, `h${i}`)}</strong> : inline(line, `l${i}`);
    return (
      <Fragment key={i}>
        {i > 0 && <br />}
        {body}
      </Fragment>
    );
  });
}

/** Strip the markers, for places that take plain text (aria labels, tooltips). */
export function plain(text: string | undefined | null): string {
  return String(text ?? "").replace(/\*\*|__|`/g, "").replace(/(^|\s)[*_]([^*_]+)[*_]/g, "$1$2").replace(/^#{1,3}\s+/gm, "");
}
