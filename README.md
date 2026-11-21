# Soaring Symbols for draw.io

[draw.io](https://www.drawio.com) (diagrams.net) libraries of the [Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols) airline logos, icons and tails, and the marks of airline alliances.

> [!IMPORTANT]
> The airline marks are trademarks of their owners, are not covered by this project's license, and may need their owner's permission to use: read the package's [Disclaimer](https://github.com/soaring-symbols/soaring-symbols/blob/main/DISCLAIMER.md) first.

## Libraries

| Library                                      | File                | Holds                                                   |
| :------------------------------------------- | :------------------ | :------------------------------------------------------ |
| Soaring Symbols / Airline Icons              | `icons.xml`         | Every airline's icon                                    |
| Soaring Symbols / Airline Logos              | `logos.xml`         | Every airline's logo, and stacked logo where it has one |
| Soaring Symbols / Airline Tails              | `tails.xml`         | Every tail                                              |
| Soaring Symbols / Alliances                  | `alliances.xml`     | The alliance marks                                      |
| Soaring Symbols / Airline Icons (Mono), etc. | `icons-mono.xml`, … | The monochrome version of each, which you can recolor   |

Each entry is titled with the airline's name. Once a library is open, draw.io's shape search finds an airline by its name, IATA or ICAO code (`VN`, `HVN`), shorter name (SWISS) or former name.

## Usage

### app.diagrams.net

Choose **File > Open Library from > URL** and paste one of these:

```text
https://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/icons.xml
https://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/logos.xml
https://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/tails.xml
https://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/alliances.xml
```

For the mono libraries, add `-mono` before `.xml` (`icons-mono.xml`). Or open the four color libraries at once with [this link](https://app.diagrams.net/?clibs=Uhttps://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/icons.xml;Uhttps://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/logos.xml;Uhttps://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/tails.xml;Uhttps://cdn.jsdelivr.net/npm/soaring-symbols-drawio@0.5/dist/alliances.xml).

### draw.io desktop

Download a library from one of the links above and open it with **File > Open Library**.

### Mono marks

The mono libraries hold every monochrome mark, black in draw.io's light mode and white in its dark mode. Select one and change **Fill** in the Style panel to paint it any color, with a color of its own for dark mode under **Advanced**.

### Versions

Each release is built from the [soaring-symbols](https://www.npmjs.com/package/soaring-symbols) release of the same version (`soaring-symbols-drawio@0.5.3` holds the marks of `soaring-symbols@0.5.3`). The links above follow the `0.5` release line, so each new release reaches them; for files that never change, link an exact release (`soaring-symbols-drawio@0.5.3`). Every mark is embedded in the library, so a diagram keeps a mark as it was when it was added, offline and after later releases.

## Development

Node 20.12 or newer.

```bash
npm install
npm test
```

| Command           | What it does                                                         |
| :---------------- | :------------------------------------------------------------------- |
| `npm run build`   | Build the libraries into `dist/` from the `soaring-symbols` package. |
| `npm test`        | Build, then check the libraries against that package.                |
| `npm run lint`    | ESLint and Prettier.                                                 |
| `npm run format`  | Prettier.                                                            |
| `npm run release` | Publish a release (see below).                                       |

## Releasing

For now, a release is made by hand after each soaring-symbols release:

```bash
npm run release -- 0.5.3
```

It installs `soaring-symbols@0.5.3`, builds and tests the libraries, publishes `soaring-symbols-drawio@0.5.3` to npm, and commits and tags `v0.5.3` without pushing. Without a version it takes the latest soaring-symbols on npm; `--dry-run` stops before publishing. Pushing the tag (`git push --atomic origin main v0.5.3`) publishes a GitHub release and purges jsDelivr's cache of the libraries.

Since the version follows soaring-symbols, a change here alone waits for the next soaring-symbols release.

### Releasing automatically (not decided)

Two ways to release without running the script by hand are under consideration:

- **A. Triggered by soaring-symbols.** Its release workflow, run when a `v*` tag is pushed (after `npm publish`), sends a `repository_dispatch` event to this repository, which then installs that version, builds, tests, publishes with npm Trusted Publishing, and commits, tags and pushes the release. It releases within minutes, but needs a fine-grained token with Contents write access to this repository, stored as a secret in soaring-symbols (the default `GITHUB_TOKEN` can't reach another repository).
- **B. On a schedule.** A workflow here runs every few hours, compares soaring-symbols' latest version on npm with its own, and releases when they differ. It needs no token in soaring-symbols, but a release can lag by a few hours.

Either one would also allow a manual run (`workflow_dispatch`) to retry a failed release, for example after a breaking soaring-symbols release changes what the build reads.

## License

The code is [MIT](LICENSE). The airline marks are trademarks of their owners; read the package's [Disclaimer](https://github.com/soaring-symbols/soaring-symbols/blob/main/DISCLAIMER.md) before using them.
