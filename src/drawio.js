// draw.io (diagrams.net) libraries of the Soaring Symbols marks, written to
// dist/ by scripts/build.js: one file per kind of mark, which File > Open
// Library from > URL opens in the editor's sidebar. A library is an
// <mxlibrary> element holding a JSON list of entries; each entry here embeds
// its SVG as a data URI, so a diagram keeps showing the mark offline and after
// later releases. Each library has a mono version of the monochrome marks,
// whose color draw.io can change.

// The size an entry is dropped at, by type: logos and stacked logos are drawn
// on a 64×64 canvas, icons and tails on 24×24
const DRAWIO_SIZES = { icon: 48, logo: 96, 'logo-stacked': 96, tail: 48 }

// The kinds of library: the file name, the title draw.io shows over the
// library in its sidebar (else the file name), the mark types it holds (in
// that order for each airline or alliance), where the marks are, and the word
// added to the title of a type's entries, which draw.io shows on hover, where
// one name has more than one entry
const KINDS = [
    {
        name: 'icons',
        title: 'Airline Icons',
        types: ['icon'],
        root: 'airlines',
    },
    {
        name: 'logos',
        title: 'Airline Logos',
        types: ['logo', 'logo-stacked'],
        root: 'airlines',
        labels: { 'logo-stacked': 'stacked' },
    },
    {
        name: 'tails',
        title: 'Airline Tails',
        types: ['tail'],
        root: 'airlines',
    },
    {
        name: 'alliances',
        title: 'Alliances',
        types: ['icon', 'logo'],
        root: 'alliances',
        labels: { icon: 'icon', logo: 'logo' },
    },
]

// The libraries the build writes: each kind in color (icons.xml, of the
// icon.svg files) and in mono (icons-mono.xml, of the icon-mono.svg files)
const DRAWIO_LIBRARIES = KINDS.flatMap(({ name, title, ...kind }) => [
    { ...kind, file: `${name}.xml`, title: `Soaring Symbols / ${title}` },
    {
        ...kind,
        file: `${name}-mono.xml`,
        title: `Soaring Symbols / ${title} (Mono)`,
        mono: true,
    },
])

const escapeXml = (text) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The words draw.io's shape search finds an airline by besides its name (it
// searches each entry's title and tags): its IATA and ICAO codes, the shorter
// names in `aliases`, and its former names and codes, each once
const drawioTags = ({ iata, icao, aliases = [], former = [] }) => {
    const words = [
        iata,
        icao,
        ...aliases.map((alias) => alias.name),
        ...former.flatMap((item) => [item.name, item.iata, item.icao]),
    ]

    return [...new Set(words.filter(Boolean))].join(' ')
}

// A mono SVG draw.io can recolor: its fill="currentColor", which draw.io
// would paint black, becomes a style rule (editableCssRules in the entry lets
// draw.io's Style panel edit it) that is black in light mode and white in dark
// mode, as draw.io writes the rule itself when a color is picked. Throws on
// an SVG painted any other way, which the rule would repaint.
const recolorableMono = (svg) => {
    const fills = svg.match(/\s(fill|stroke)="[^"]*"|<style|\sstyle="/g) ?? []
    const root = svg.match(/^<svg[^>]*>/)?.[0] ?? ''
    if (
        fills.length !== 1 ||
        fills[0] !== ' fill="currentColor"' ||
        !root.includes(fills[0]) ||
        !svg.includes('</title>')
    ) {
        throw new Error(
            'drawio: a mono SVG needs fill="currentColor" on <svg>, no other paint, and a <title>',
        )
    }

    return svg
        .replace(
            root,
            root.replace(fills[0], ' style="color-scheme:light dark"'),
        )
        .replace(
            '</title>',
            '</title><style>*{fill:light-dark(#000000,#ffffff)}</style>',
        )
}

// One library entry for an SVG: an image for a color mark; for a mono one, an
// image cell whose fill draw.io can edit, which only a cell's style can say
const drawioEntry = (svg, title, type, tags, mono) => {
    const size = DRAWIO_SIZES[type]
    const base64 = Buffer.from(mono ? recolorableMono(svg) : svg).toString(
        'base64',
    )
    const entry = mono
        ? {
              xml:
                  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
                  '<mxCell id="2" style="shape=image;verticalLabelPosition=bottom;' +
                  'verticalAlign=top;imageAspect=0;aspect=fixed;editableCssRules=.*;' +
                  `image=data:image/svg+xml,${base64};" vertex="1" parent="1">` +
                  `<mxGeometry width="${size}" height="${size}" as="geometry"/>` +
                  '</mxCell></root></mxGraphModel>',
          }
        : { data: `data:image/svg+xml;base64,${base64}` }

    return {
        ...entry,
        w: size,
        h: size,
        title,
        ...(tags && { tags }),
        ...(!mono && { aspect: 'fixed' }),
    }
}

// The library file titled `title` for `marks` ({ name, type, svg, tags? },
// in the order given; mono marks with `mono`), each titled with its name and
// the type's word in `labels`, if any
const drawioLibrary = (marks, { title, labels = {}, mono = false } = {}) =>
    `<mxlibrary${title ? ` title="${escapeXml(title).replace(/"/g, '&quot;')}"` : ''}>${escapeXml(
        JSON.stringify(
            marks.map(({ name, type, svg, tags }) =>
                drawioEntry(
                    svg,
                    labels[type] ? `${name} (${labels[type]})` : name,
                    type,
                    tags,
                    mono,
                ),
            ),
        ),
    )}</mxlibrary>`

export {
    DRAWIO_LIBRARIES,
    DRAWIO_SIZES,
    drawioLibrary,
    drawioTags,
    recolorableMono,
}
