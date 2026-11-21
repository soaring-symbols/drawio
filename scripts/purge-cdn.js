// Purge jsDelivr's cache of the libraries, so links to the release line
// (@soaring-symbols/drawio@0.<minor>/dist/...) and to the bare package serve
// a new release right away instead of after up to 12 hours. Exact-release
// links never need it. Every library is purged: a release rebuilds them all,
// and purging one that didn't change does no harm.
//
// The release workflow (.github/workflows/release.yml) runs it once the
// release's tag is pushed. To run it again by hand:
//
//   node scripts/purge-cdn.js --version <version> [--wait <minutes>] [--dry-run]
//
// jsDelivr takes several minutes to resolve a release line to a new release,
// so it waits for that first, up to `--wait` minutes.
import { parseArgs } from 'util'
import { DRAWIO_LIBRARIES } from '../src/drawio.js'

const PACKAGE = '@soaring-symbols/drawio'
const RESOLVE_URL = `https://data.jsdelivr.com/v1/packages/npm/${PACKAGE}/resolved?specifier=`
const PURGE_URL = `https://purge.jsdelivr.net/npm/${PACKAGE}`
const WAIT_MINUTES = 20
const POLL_MS = 15 * 1000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const resolvesTo = async (specifier, version) => {
    try {
        const res = await fetch(`${RESOLVE_URL}${specifier}`)

        return res.ok && (await res.json()).version === version
    } catch {
        return false
    }
}

const purge = async (path) => {
    try {
        const res = await fetch(`${PURGE_URL}${path}`)

        return res.ok && (await res.json()).status === 'finished'
    } catch {
        return false
    }
}

const { values } = parseArgs({
    options: {
        version: { type: 'string' },
        wait: { type: 'string', default: String(WAIT_MINUTES) },
        'dry-run': { type: 'boolean', default: false },
    },
})
const { version } = values
const wait = Number(values.wait)
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !(wait >= 0)) {
    console.error(
        'Usage: node scripts/purge-cdn.js --version <version> [--wait <minutes>] [--dry-run]',
    )
    process.exit(1)
}

const line = version.split('.').slice(0, 2).join('.')
const paths = DRAWIO_LIBRARIES.flatMap(({ file }) => [
    `@${line}/dist/${file}`,
    `/dist/${file}`,
])
console.log(`${paths.length} path(s) to purge on jsDelivr.`)
if (values['dry-run']) {
    paths.forEach((path) => console.log(`  ${path}`))
    process.exit(0)
}

// Purging before jsDelivr resolves the line and the bare package (`latest`)
// to the new release would only cache the previous release's files again
console.log(
    `Waiting up to ${wait} min for jsDelivr to resolve ${PACKAGE}@${line} and ${PACKAGE} to ${version}…`,
)
const deadline = Date.now() + wait * 60 * 1000
let resolved = false
while (!resolved && Date.now() < deadline) {
    resolved =
        (await resolvesTo(line, version)) &&
        (await resolvesTo('latest', version))
    if (!resolved) await sleep(POLL_MS)
}
if (!resolved) {
    console.log(
        `⚠️  jsDelivr still doesn't resolve @${line} to ${version}; nothing was purged. Rerun "node scripts/purge-cdn.js --version ${version}" later.`,
    )
    process.exit(1)
}

const failed = []
for (const path of paths) {
    if (!(await purge(path))) failed.push(path)
}
if (failed.length) {
    console.log(
        `⚠️  ${failed.length} of ${paths.length} purge(s) failed; rerun "node scripts/purge-cdn.js --version ${version}":`,
    )
    failed.forEach((path) => console.log(`  ${path}`))
    process.exit(1)
}
console.log(`✅ Purged ${paths.length} path(s) from jsDelivr.`)
