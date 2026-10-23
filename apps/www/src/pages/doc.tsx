import { marked } from "marked";
import { useEffect, useState } from "react";
import { Footer, Nav, REPO } from "@/components/site";

/** A page rendered from a markdown file in docs/, so the site and the repo never disagree. */
export function DocPage({ load, path }: { load: () => Promise<string>; path: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let live = true;
    load().then((source) => live && setHtml(marked.parse(source, { async: false, gfm: true }) as string));
    return () => void (live = false);
  }, [load]);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
        <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          This page is{" "}
          <a className="text-foreground underline underline-offset-4" href={`${REPO}/blob/main/${path}`}>
            {path}
          </a>{" "}
          in the repository.
        </p>
      </main>
      <Footer />
    </div>
  );
}
