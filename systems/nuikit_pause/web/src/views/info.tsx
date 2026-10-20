import { useState } from "react";
import type { PausePage } from "../nui";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blocks } from "@/lib/format";
import { icon } from "@/lib/icons";

/** The server's pages (Config.pages): plain text with paragraphs and lists, one tab each. */
export function InfoPanel({ pages }: { pages: PausePage[] }) {
  const [id, setId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === id) ?? pages[0];
  if (!page) return null;
  const Icon = icon(pages.length > 1 ? "info" : page.icon);

  return (
    <Panel size="lg" className="max-h-[calc(100vh-6rem)]">
      <PanelHeader
        icon={<Icon />}
        title={pages.length > 1 ? "Info" : page.title}
        tabs={
          pages.length > 1 ? (
            <Tabs value={page.id} onValueChange={setId}>
              <TabsList className="w-full">
                {pages.map((p) => (
                  <TabsTrigger key={p.id} value={p.id}>
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : undefined
        }
      />
      <PanelBody scroll variant="form" className="max-h-[34rem]">
        {blocks(page.body).map((b, i) =>
          b.kind === "p" ? (
            <p key={i} className="text-sm leading-6">
              {b.text}
            </p>
          ) : (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6 marker:text-muted-foreground">
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ),
        )}
      </PanelBody>
    </Panel>
  );
}
