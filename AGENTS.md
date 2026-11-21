# AGENTS.md

Instructions for AI coding agents working on the Soaring Symbols draw.io libraries. Human-facing docs live in `README.md`.

## Project

draw.io (diagrams.net) libraries of the [Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols) marks, published to npm as `soaring-symbols-drawio` and read through jsDelivr (`https://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.<minor>/dist/<file>.xml`).

- `src/drawio.js` — the libraries: `DRAWIO_LIBRARIES` (one per kind of mark: `icons.xml`, `logos.xml` with the stacked logos, `tails.xml`, `alliances.xml`, each also as `-mono.xml`), `drawioLibrary` and `drawioTags`. A library is an `<mxlibrary>` titled for draw.io's sidebar (`Soaring Symbols / Airline Icons`, `Soaring Symbols / Airline Icons (Mono)`; without a `title` draw.io shows the file name) of entries titled with the name and tagged by `drawioTags` (IATA and ICAO codes, aliases, former names and codes), which draw.io's shape search reads. A color entry is an image with the SVG as a base64 data URI; a mono one is a cell (`xml`) with `editableCssRules=.*`, its SVG rewritten by `recolorableMono` (the root `fill="currentColor"` becomes `<style>*{fill:light-dark(#000000,#ffffff)}</style>`, the form draw.io itself writes, so its Style panel can recolor it), which throws on a mono painted any other way, failing the build.
- `scripts/build.js` — writes `dist/` (git-ignored, the only thing published) from the `soaring-symbols` devDependency's `dist/`: the catalogs (`airlines.json`, `alliances.json`, with each entry's `assets`) and each airline's or alliance's current files at its own slug, shared marks and derived monos included. It reads nothing from the soaring-symbols repository.
- `test/` — `node:test`: each library has every current mark of its kind and nothing else, byte for byte, plus unit tests for the helpers.
- `scripts/release.js` — the manual release (below); `scripts/purge-cdn.js` purges jsDelivr, run by `.github/workflows/release.yml` on a pushed `v*` tag.

draw.io facts the code relies on, checked in app.diagrams.net:

- The style of an image cell takes base64 after `data:image/svg+xml,` (draw.io drops `;base64` from a library's data URIs); an SVG can't be embedded as text, so the libraries are about a third larger than their SVGs.
- `<mxlibrary title="…">` names the library in the sidebar, cut off with "…" past about 21 characters at its default width; hovering shows the file name, not the title.
- The shape search matches entries by their `title` and `tags`.

## Commands

| Command           | What it does                                      |
| :---------------- | :------------------------------------------------ |
| `npm run build`   | Build `dist/` from the `soaring-symbols` package. |
| `npm test`        | Build, then run `test/`.                          |
| `npm run lint`    | ESLint, then Prettier in check mode.              |
| `npm run format`  | Prettier.                                         |
| `npm run release` | Release by hand (below). Never run it unasked.    |

Node ≥ 20.12. Dependencies are tracked in both `package-lock.json` and `bun.lock`; update both together.

## Releasing

The version is always the soaring-symbols version the libraries were built from; `soaring-symbols` is an exact devDependency, set by the release. After each soaring-symbols release, the maintainer runs `npm run release -- <version>` from a clean, up-to-date `main`: it installs that soaring-symbols version, bumps `package.json`, moves the README's release line links on a new minor line, runs the tests, publishes, and commits `chore(release): v<version>` with an annotated tag `v<version>`, without pushing. Pushing (`git push --atomic origin main v<version>`) runs the release workflow: a GitHub release linking the soaring-symbols release, and a jsDelivr purge of every library under the release line and the bare package.

A fix here alone can't be released until the next soaring-symbols release (npm never republishes a version, and versions take no prerelease labels). Releasing automatically is not decided: "Releasing automatically" in `README.md` describes the two options (a `repository_dispatch` from the soaring-symbols release workflow, or a schedule here). Don't set either up until the maintainer picks one.

## Conventions

- Prettier (4 spaces, single quotes, no semicolons, trailing commas, width 80) and ESLint, including a blank line before `return`, as in the library repo.
- Commits follow Conventional Commits, e.g. `feat: add a tails library`, `fix: keep stacked logos square`, `chore(release): v0.5.3`.
