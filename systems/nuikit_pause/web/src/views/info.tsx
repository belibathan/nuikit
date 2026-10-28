import type { PausePage } from "../nui";
import { blocks } from "@/lib/format";
import { icon } from "@/lib/icons";
import { SheetPage, SheetSection } from "./sheet";

/** The server's pages (Config.pages): plain text with paragraphs and lists, each a section of one column. */
export function InfoPage({ pages, onBack }: { pages: PausePage[]; onBack: () => void }) {
  const single = pages.length === 1 ? pages[0] : undefined;
  return (
    <SheetPage title={single?.title ?? "Info"} onBack={onBack}>
      {pages.map((page) => {
        const Icon = icon(page.icon);
        return (
          <SheetSection
            key={page.id}
            label={
              single ? undefined : (
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {page.title}
                </span>
              )
            }
          >
            <div className="flex flex-col gap-3">
              {blocks(page.body).map((b, i) =>
                b.kind === "p" ? (
                  <p key={i} className="nk-text-body">
                    {b.text}
                  </p>
                ) : (
                  <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 nk-text-body marker:text-muted-foreground">
                    {b.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </SheetSection>
        );
      })}
    </SheetPage>
  );
}
