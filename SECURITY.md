# Security

nuikit runs at build time (the Vite plugin) and inside your resource's NUI (the runtime). If you find a vulnerability, such as a way for NUI messages to be spoofed or a path traversal in the CLI, please report it privately through [GitHub security advisories](https://github.com/belibathan/nuikit/security/advisories/new) instead of a public issue.

Reminder for server owners: anything a NUI callback receives came from the client. Validate on the server before trusting it.
