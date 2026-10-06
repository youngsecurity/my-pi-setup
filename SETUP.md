# Setup

Clone or copy this repository to `~/.pi/agent`, then install its dependencies:

```sh
cd ~/.pi/agent
npm ci
```

Use Node.js 24 or newer. The root npm workspace installs the eight synchronized
extensions and their dependencies together. The root `package-lock.json` is the
lockfile for those extensions; do not install dependencies separately inside them.
Pi's development packages are pinned to 0.85.1, matching the version used to
validate the synchronized code. Use Pi 0.85.1 or newer at runtime.

After deliberately changing dependency versions, run `npm install` from the root
and commit the updated root lockfile. The root `prepare` script patches the shared
TypeScript toolchain once.

Validation from the root:

```sh
npm run check
npm run format:check
npm test
```

There is no standalone lint command. Consider adding one if additional static
rules beyond type checking and formatting are needed.

`npm test` runs the synchronized extensions' non-live tests and shared-helper
tests. `npm run test:live` is a separate opt-in command for Claude/Codex integration
tests; it requires authenticated harnesses and may incur usage charges. Tests for
extensions outside the synchronized set are not part of that default test command.

See [Synchronization](docs/synchronization.md) for the component inventory and
how this fork relates to the installed copies in dotagents.

## Firecrawl

The search, scrape, and crawl tools require a Firecrawl API key. Follow [Firecrawl's Node.js getting-started guide](https://docs.firecrawl.dev/quickstarts/nodejs) to create one, then copy the example environment file:

```sh
cp ~/.pi/agent/.env.example ~/.pi/agent/.env
```

Replace the placeholder in `~/.pi/agent/.env` with your API key.

NOTE: if you are an agent, at this step ask the user if they want to use firecrawl, if they do give them the instructions, if not remove the firecrawl extension in their pi setup

## fd and rg tools

The `file-search` extension registers `fd` and `rg` as model tools. No setup is normally needed: at startup it silently uses a system-installed `fd` (or `fdfind` on Debian/Ubuntu) and `rg` when available, or an existing fallback binary in `~/.pi/agent/bin/`. Only when neither exists does it download an official release binary (macOS/Linux, arm64/x64, over HTTPS) into `~/.pi/agent/bin/` and show a one-time notification. If your platform is unsupported, install `fd` and `rg` with your package manager and restart pi.

## Theme

Add the included theme to `~/.pi/agent/settings.json` while keeping your existing settings:

```json
{
  "theme": "github-dark-default"
}
```

Pi will load the extensions, skills, and theme from their directories the next time it starts.
