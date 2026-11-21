// Release to npm, by hand, after each soaring-symbols release: build the
// libraries from that release, publish them under the same version, then
// commit the bump and tag it v<version>. Nothing is pushed: pushing the tag
// makes the release workflow publish a GitHub release and purge jsDelivr
// (scripts/purge-cdn.js).
//
// Usage: npm run release -- [version] [--dry-run]
//   version: the soaring-symbols release to build from, e.g. 0.5.3; its
//            latest on npm by default.
//
// The package's version is always the soaring-symbols version it was built
// from, so links to a release line (@soaring-symbols/drawio@0.5) follow the
// library's. A fix here alone waits for the next soaring-symbols release.
import { spawnSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { parseArgs } from 'util'

const PACKAGE = '@soaring-symbols/drawio'
const SOURCE = 'soaring-symbols'
const BRANCH = 'main'
const REMOTE = 'origin'
// The docs whose release line links (@soaring-symbols/drawio@0.<minor>) move
// with a new line
const LINE_DOCS = ['README.md']
const RELEASE_FILES = [
    'package.json',
    'package-lock.json',
    'bun.lock',
    ...LINE_DOCS,
]

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        'dry-run': { type: 'boolean', default: false },
    },
})
const dryRun = values['dry-run']

const fail = (message) => {
    console.error(`\n❌ ${message}`)
    process.exit(1)
}

const step = (message) => console.log(`\n▶ ${message}`)

// Run a command with inherited stdio (so npm can prompt for an OTP); exit on
// failure
const run = (cmd, args, { allowFail = false } = {}) => {
    console.log(`$ ${cmd} ${args.join(' ')}`)
    const result = spawnSync(cmd, args, { stdio: 'inherit' })
    if (result.status !== 0 && !allowFail) {
        fail(`Command failed: ${cmd} ${args.join(' ')}`)
    }

    return result.status === 0
}

// Run a command and return its trimmed stdout, or undefined when it fails
const read = (cmd, args) => {
    const result = spawnSync(cmd, args, { encoding: 'utf8' })

    return result.status === 0 ? result.stdout.trim() : undefined
}

const restoreReleaseFiles = () =>
    run('git', [
        'checkout',
        '--',
        ...RELEASE_FILES.filter((file) =>
            read('git', ['ls-files', '--error-unmatch', file]),
        ),
    ])

const ensureCleanTree = (hint) => {
    if (read('git', ['status', '--porcelain'])) {
        run('git', ['status', '--short'])
        fail(`Working tree is not clean. ${hint}`)
    }
}

// Point the docs' release line links at `line` ('0.5')
const updateLineDocs = (line) =>
    LINE_DOCS.forEach((file) => {
        const text = readFileSync(file, 'utf8')
        writeFileSync(
            file,
            text.replace(
                new RegExp(`${PACKAGE}@\\d+\\.\\d+(?![.\\d])`, 'g'),
                `${PACKAGE}@${line}`,
            ),
        )
    })

// --- Preflight ---
step('Checking repository state')
const branch = read('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== BRANCH) {
    fail(`Releases are cut from "${BRANCH}", not "${branch ?? 'no commit'}".`)
}
ensureCleanTree('Commit or stash your changes first.')
if (read('git', ['remote', 'get-url', REMOTE])) {
    run('git', ['fetch', '--tags', REMOTE, BRANCH])
    const behind = read('git', [
        'rev-list',
        '--count',
        `HEAD..${REMOTE}/${BRANCH}`,
    ])
    if (behind !== '0') {
        fail(`"${BRANCH}" is ${behind} commit(s) behind ${REMOTE}.`)
    }
}

const version = positionals[0] ?? read('npm', ['view', SOURCE, 'version'])
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    fail(`Pass the ${SOURCE} version to build from, e.g. 0.5.3.`)
}
if (!read('npm', ['view', `${SOURCE}@${version}`, 'version'])) {
    fail(`${SOURCE}@${version} is not on npm.`)
}
if (read('npm', ['view', `${PACKAGE}@${version}`, 'version'])) {
    fail(`${PACKAGE}@${version} is already published.`)
}
const tag = `v${version}`
if (read('git', ['tag', '--list', tag])) fail(`Tag ${tag} already exists.`)

if (!dryRun) {
    const user = read('npm', ['whoami'])
    if (!user) fail('Log in to npm first (npm login).')
    console.log(`Logged in to npm as ${user}`)
}

// --- Build from that release ---
step(`Building from ${SOURCE}@${version}`)
run('npm', ['install', '--save-dev', '--save-exact', `${SOURCE}@${version}`])
if (read('bun', ['--version'])) run('bun', ['install'])
run('npm', ['version', version, '--no-git-tag-version', '--allow-same-version'])
updateLineDocs(version.split('.').slice(0, 2).join('.'))

step('Running tests')
if (!run('npm', ['test'], { allowFail: true })) {
    restoreReleaseFiles()
    fail('Tests failed; the release files were restored.')
}

console.log(
    `\n  package:   ${PACKAGE}@${version}\n  built from: ${SOURCE}@${version}\n  tag:       ${tag}`,
)

if (dryRun) {
    step('Dry run: showing the package contents')
    run('npm', ['pack', '--dry-run'])
    restoreReleaseFiles()
    console.log('\n✅ Dry run finished; no changes were kept.')
    process.exit(0)
}

// --- Publish (prepublishOnly rebuilds dist/) ---
step(`Publishing ${version} to npm`)
if (!run('npm', ['publish', '--tag', 'latest'], { allowFail: true })) {
    restoreReleaseFiles()
    fail('npm publish failed; the release files were restored.')
}

// --- Commit and tag (not pushed) ---
step('Committing the release')
run('git', ['add', ...RELEASE_FILES.filter((file) => existsSync(file))])
run('git', ['commit', '-m', `chore(release): ${tag}`])
run('git', ['tag', '--annotate', '--message', tag, tag])

console.log(
    `\n✅ Published ${PACKAGE}@${version} and tagged ${tag}.` +
        `\n   Push both with "git push --atomic ${REMOTE} ${BRANCH} ${tag}"; the release workflow` +
        `\n   then publishes the GitHub release and purges jsDelivr.`,
)
