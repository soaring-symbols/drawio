// Tests for the libraries in dist/. Run with `npm test` (builds first).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import {
    DRAWIO_LIBRARIES,
    drawioLibrary,
    drawioTags,
    recolorableMono,
} from '../src/drawio.js'

// The soaring-symbols package the libraries were built from
const SOURCE = pathToFileURL(
    createRequire(import.meta.url)
        .resolve('soaring-symbols/package.json')
        .replace(/package\.json$/, ''),
)

describe('draw.io libraries', () => {
    // A library's root element, and its entries as draw.io reads them: the
    // JSON text of the <mxlibrary> element, after XML parsing
    const parse = (xml) =>
        new JSDOM(xml, { contentType: 'text/xml' }).window.document
            .documentElement
    const entriesOf = (xml) => {
        const root = parse(xml)
        assert.equal(root.nodeName, 'mxlibrary')

        return JSON.parse(root.textContent)
    }
    // A mono entry's cell style, and the SVG an entry inserts: an image's
    // data URI, or the image in that style
    const cellStyleOf = (entry) =>
        new JSDOM(entry.xml, { contentType: 'text/xml' }).window.document
            .querySelector('mxCell[vertex="1"]')
            .getAttribute('style')
    const svgOf = (entry, style = entry.xml && cellStyleOf(entry)) =>
        Buffer.from(
            entry.data
                ? entry.data.replace('data:image/svg+xml;base64,', '')
                : style.match(/image=data:image\/svg\+xml,([^;]+)/)[1],
            'base64',
        ).toString('utf-8')

    it('ships one entry per current mark of each library, by name', () => {
        const catalogs = {
            assets: JSON.parse(
                readFileSync(new URL('dist/airlines.json', SOURCE)),
            ),
            alliances: JSON.parse(
                readFileSync(new URL('dist/alliances.json', SOURCE)),
            ),
        }
        for (const {
            file,
            title,
            types,
            root,
            labels = {},
            mono,
        } of DRAWIO_LIBRARIES) {
            const xml = readFileSync(
                new URL(`../dist/${file}`, import.meta.url),
                'utf-8',
            )
            assert.equal(parse(xml).getAttribute('title'), title)
            const entries = entriesOf(xml)
            const expected = catalogs[root].flatMap((entry) =>
                types
                    .filter(
                        (type) => entry.assets[type]?.[mono ? 'mono' : 'color'],
                    )
                    .map((type) => ({ ...entry, type })),
            )
            assert.deepEqual(
                entries.map((e) => e.title),
                expected.map(({ name, type }) =>
                    labels[type] ? `${name} (${labels[type]})` : name,
                ),
                file,
            )
            entries.forEach((entry, i) => {
                const { slug, type } = expected[i]
                assert.equal(
                    entry.tags,
                    drawioTags(expected[i]) || undefined,
                    `${file}: ${entry.title}`,
                )
                const svg = readFileSync(
                    new URL(
                        `dist/${root}/${slug}/${type}${mono ? '-mono' : ''}.svg`,
                        SOURCE,
                    ),
                    'utf-8',
                )
                const style = mono && cellStyleOf(entry)
                assert.equal(
                    svgOf(entry, style),
                    mono ? recolorableMono(svg) : svg,
                    `${file}: ${entry.title}`,
                )
                if (mono) {
                    assert.match(style, /editableCssRules=\.\*;/)
                    assert.match(style, /aspect=fixed;/)
                } else {
                    assert.equal(entry.aspect, 'fixed')
                }
                assert.ok(entry.w > 0 && entry.w === entry.h)
            })
        }
    })

    it('tags an airline with its codes and other names, each once', () => {
        assert.equal(
            drawioTags({
                name: 'Example Air',
                iata: 'EX',
                icao: 'EXA',
                aliases: [{ name: 'EXAIR' }],
                former: [
                    { name: 'Old Air', iata: 'OA', until: 2001 },
                    { iata: 'EX', icao: 'EXX', until: 2010 },
                    { callsign: 'EXAMPLE', until: 2012 },
                ],
            }),
            'EX EXA EXAIR Old Air OA EXX',
        )
        assert.equal(drawioTags({ name: 'SkyTeam', slug: 'skyteam' }), '')
    })

    it('makes a mono SVG recolorable, black on light and white on dark', () => {
        assert.equal(
            recolorableMono(
                '<svg role="img" viewBox="0 0 24 24" fill="currentColor"><title>A</title><path fill-rule="evenodd" d="M0 0h1"/></svg>',
            ),
            '<svg role="img" viewBox="0 0 24 24" style="color-scheme:light dark"><title>A</title><style>*{fill:light-dark(#000000,#ffffff)}</style><path fill-rule="evenodd" d="M0 0h1"/></svg>',
        )
        // Any other paint would be repainted by the rule
        for (const svg of [
            '<svg><title>A</title><path fill="currentColor"/></svg>',
            '<svg fill="currentColor"><title>A</title><path fill="#ffffff"/></svg>',
            '<svg fill="currentColor"><title>A</title><path stroke="currentColor"/></svg>',
            '<svg fill="#000000"><title>A</title><path/></svg>',
        ]) {
            assert.throws(() => recolorableMono(svg), /drawio/, svg)
        }
    })

    it('escapes names and the title for XML', () => {
        const svg = '<svg><title>A &amp; B</title></svg>'
        const xml = drawioLibrary(
            [{ name: 'A & B <Air>', type: 'icon', svg }],
            {
                title: 'A "B" & C',
            },
        )
        assert.equal(parse(xml).getAttribute('title'), 'A "B" & C')
        const [entry] = entriesOf(xml)
        assert.equal(entry.title, 'A & B <Air>')
        assert.equal(svgOf(entry), svg)
    })
})
