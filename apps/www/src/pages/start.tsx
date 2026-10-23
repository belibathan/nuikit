import { CodeBlock, Command } from "@/components/code";
import { Footer, Nav, REPO, SITE } from "@/components/site";

const INSTALL = `${REPO}/blob/main/docs/install.md`;

const STEPS = [
  {
    title: "Download the zip for your framework",
    body: (
      <>
        <code>nuikit-qbox.zip</code>, <code>-qbcore</code>, <code>-esx</code> or <code>-standalone</code> from the{" "}
        <a href={`${REPO}/releases/latest`}>latest release</a>.
      </>
    ),
  },
  { title: "Put the [nuikit] folder in resources/", body: <>The runtime, the systems (HUD, pause, death, loading, chat) and the adapters for your framework.</> },
  {
    title: "Add one line to server.cfg, after your framework",
    body: <CodeBlock lang="bash" code={`exec @nuikit/nuikit.cfg`} className="mt-3" />,
  },
  {
    title: "Copy the overrides you want over their resources",
    body: (
      <>
        For each folder in <code>overrides/</code>, back up the real resource and merge ours over it. Start order, what gets stopped and the upgrade path per framework:{" "}
        <a href={INSTALL}>docs/install.md</a>.
      </>
    ),
  },
];

/** /start: run nuikit on a server, build a UI, use it from Lua, add a component. */
export function StartPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <article className="doc">
          <h1>Getting started</h1>
          <p>
            Four ways in, shortest first: run it on a server, build a UI with the kit, use the runtime from Lua, add one component to a UI you already have.
          </p>

          <h2>Run it on a server</h2>
          <ol>
            {STEPS.map((s) => (
              <li key={s.title}>
                <strong>{s.title}.</strong> {s.body}
              </li>
            ))}
          </ol>
          <p>
            New Qbox servers can use the txAdmin recipe in <a href={`${REPO}/blob/main/install/recipe-qbox.yaml`}>install/recipe-qbox.yaml</a>. Pick a theme by copying one from{" "}
            <code>nuikit/themes/</code> over <code>nuikit/theme.css</code> (or paste any TweakCN theme) and run <code>nuikit theme reload</code>; the{" "}
            <a href="/theme">theme studio</a> previews it first.
          </p>

          <h2>Build a UI</h2>
          <p>
            Start from a <a href="/blocks">block</a>: a whole screen with its Lua, typed messages and the kit, already at level 3.
          </p>
          <Command>npm create nuikit@latest my-ui -- -t garage</Command>
          <Command className="mt-2">cd my-ui/web && npm run dev</Command>
          <p>
            Press <code>`</code> in the browser for the devtools that fake the game. <code>npm run build</code> writes <code>web/dist</code> and points <code>ui_page</code> back at it.
          </p>

          <h2>Use it from Lua</h2>
          <p>
            Any resource imports the runtime from the <code>nuikit</code> resource, like ox_lib. It gets <code>nk</code>: surfaces (focus, cursor, Escape and stacking across resources), messaging, intents, theme and player context.
          </p>
          <CodeBlock
            lang="lua"
            title="fxmanifest.lua"
            code={`dependency 'nuikit'
shared_script '@nuikit/init.lua'

ui_page 'web/dist/index.html'
nuikit_protocol '1'`}
          />
          <CodeBlock
            lang="lua"
            title="client/main.lua"
            className="mt-3"
            code={`local shop = nk.surface('shop', { layer = 'panel', hides = { 'hud' } })
shop:open({ items = GetItems() })   -- focus, cursor and Escape handled across resources
nk.notify({ title = 'Paid', type = 'success' })`}
          />
          <p>
            Every call is in the <a href="/protocol">protocol</a> and the <a href="/intents">intents</a> pages. Making a resource you sell nuikit-native: <a href="/adopt">adopt</a>.
          </p>

          <h2>Add a component</h2>
          <p>
            The registry is shadcn-native: one command adds a component and everything it depends on to any shadcn project.
          </p>
          <Command>{`npx shadcn add ${SITE}/r/menu-row.json`}</Command>
          <p>
            Browse them on <a href="/components">/components</a>. Run <code>nuikit check ./my-resource</code> to see your conformance level (1 to 3) and what keeps you from the next.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
