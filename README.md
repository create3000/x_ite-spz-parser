# x_ite-spz-parser

[![npm Version](https://img.shields.io/npm/v/x_ite-spz-parser)](https://www.npmjs.com/package/x_ite-spz-parser)
[![Build Size](https://img.shields.io/bundlephobia/minzip/x_ite-spz-parser)](https://bundlephobia.com/package/x_ite-spz-parser)
[![jsDelivr Hits](https://data.jsdelivr.com/v1/package/npm/x_ite-spz-parser/badge?style=rounded)](https://create3000.github.io/jsdelivr-download-stats/?username=create3000&repository=x_ite-spz-parser)
[![npm Downloads](https://img.shields.io/npm/dm/x_ite-spz-parser)](https://npmtrends.com/x_ite-spz-parser)

SPZ File Format Parser for [X_ITE](https://create3000.github.io/x_ite/) for 3D Gaussian Splatting

## Usage

Include the script before X_ITE:

```html
<script defer src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@2.1.0/dist/x_ite-spz-parser-4.min.js"></script>
<!-- or/and for version 1-3 SPZ format -->
<script defer src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@2.1.0/dist/x_ite-spz-parser-123.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/x_ite@VERSION/dist/x_ite.min.js"></script>

<!-- or as ES module -->
<script type="module" src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@2.1.0/dist/x_ite-spz-parser-4.min.js"></script>
<!-- or/and for version 1-3 SPZ format -->
<script type="module" src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@2.1.0/dist/x_ite-spz-parser-123.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/x_ite@VERSION/dist/x_ite.min.mjs"></script>
```

You can now load `.spz` files directly using the `src` attribute, but you can also use `.spz` files as source of an Inline node.

```html
<x3d-canvas src="room.spz"></x3d-canvas>
```

## NPM

You can also install it from npm:

```sh
npm i x_ite-spz-parser
```

## Converter

Look at the bottom part of the following page, there is a converter: https://www.nianticspatial.com/blog/spz4

## License

x_ite-spz-parser is free software and licensed under the [MIT License](LICENSE.md).
