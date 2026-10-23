# Security

## Supported versions

Only the latest release gets fixes. Upgrade before reporting if you can.

## Reporting a vulnerability

Please report privately through [GitHub security advisories](https://github.com/belibathan/nuikit/security/advisories/new),
not a public issue. Include the affected resource or package, the version, and steps to reproduce. We aim to
reply within a week; fixes ship in the next release and the advisory credits you unless you'd rather not.

In scope: the `[nuikit]` resources, the overrides and adapters, `nuikit-core`, `vite-plugin-nuikit`,
`create-nuikit` and the CLI. Examples: spoofed NUI messages or callbacks, a resource reaching another resource's
callbacks through the runtime, HTML injection in a screen, path traversal in the CLI or Vite plugin.

## For server owners

Anything a NUI callback receives came from the client. Validate on the server before trusting it, and keep the
blocks' server-side checks for money and items in place.
