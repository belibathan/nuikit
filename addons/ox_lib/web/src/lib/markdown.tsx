import { Children, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { withKeys } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Key tokens ([E], [LEFT MOUSE]) in the text nodes of the elements that hold prose become keycaps. */
const keyed = (Tag: keyof React.JSX.IntrinsicElements) =>
  function Keyed({ node: _node, children, ...rest }: { node?: unknown; children?: ReactNode }) {
    const T = Tag as React.ElementType;
    return <T {...rest}>{Children.map(children, (c) => withKeys(c))}</T>;
  };
const KEYED: Components = Object.fromEntries(
  ["p", "li", "strong", "em", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "del"].map((t) => [t, keyed(t as keyof React.JSX.IntrinsicElements)])
);

/** Script-provided markdown. Raw HTML is never rendered. `gfm` adds tables, strikethrough, task lists. `[KEY]` tokens render as keycaps unless `keys` is false. */
export function Markdown({ children, gfm, className, keys = true }: { children?: string | null; gfm?: boolean; className?: string; keys?: boolean }) {
  if (!children) return null;
  return (
    <div className={cn("ox-md", className)}>
      <ReactMarkdown remarkPlugins={gfm ? [remarkGfm] : []} components={keys ? KEYED : undefined}>
        {String(children)}
      </ReactMarkdown>
    </div>
  );
}
