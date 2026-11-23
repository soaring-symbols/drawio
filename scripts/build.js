// Build the draw.io libraries (src/drawio.js) into dist/ from the published
// soaring-symbols package in node_modules: its dist/ already holds every
// airline's files at its own slug (shared marks copied in), the derived
// -mono.svg files and the catalogs with each entry's `assets`. The version
// built is the one in package.json's devDependencies, which
// scripts/release.js sets to the release being made.
import { existsSync, promises as fs } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { DRAWIO_LIBRARIES, drawioLibrary, drawioTags } from '../src/drawio.js'

const require = createRequire(import.meta.url)
// The package exports only its library and marks, so read its dist/ from the
// folder its package.json is in
const SOURCE = path.join(
    path.dirname(require.resolve('soaring-symbols/package.json')),
    'dist',
)
const DIST = 'dist'

const readJson = async (file) =>
    JSON.parse(await fs.readFile(path.join(SOURCE, file), 'utf-8'))

// Each airline's or alliance's current color (or, for a mono library, mono)
// marks of the library's types, by name and tagged with its codes and other
// names for draw.io's search (never the history/ folders or the copies at
// alias and former slugs)
async function build() {
    const entriesByRoot = {
        airlines: await readJson('airlines.json'),
        alliances: await readJson('alliances.json'),
    }
    await fs.mkdir(DIST, { recursive: true })
    for (const { file, title, types, root, labels, mono } of DRAWIO_LIBRARIES) {
        const marks = []
        for (const entry of entriesByRoot[root]) {
            const { name, slug } = entry
            const tags = drawioTags(entry)
            for (const type of types) {
                const svgPath = path.join(
                    SOURCE,
                    root,
                    slug,
                    `${type}${mono ? '-mono' : ''}.svg`,
                )
                if (!existsSync(svgPath)) continue
                const svg = await fs.readFile(svgPath, 'utf-8')
                marks.push({ name, type, svg, tags })
            }
        }
        await fs.writeFile(
            path.join(DIST, file),
            drawioLibrary(marks, { title, labels, mono }),
        )
        console.log(`${file}: ${marks.length} marks`)
    }
}

build().catch((err) => {
    console.error('Build failed:', err)
    process.exit(1)
})
