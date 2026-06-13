# x_ite-spz-parser

[![npm Version](https://img.shields.io/npm/v/x_ite-spz-parser)](https://www.npmjs.com/package/x_ite-spz-parser)
[![Build Size](https://img.shields.io/bundlephobia/minzip/x_ite-spz-parser)](https://bundlephobia.com/package/x_ite-spz-parser)
[![jsDelivr Hits](https://data.jsdelivr.com/v1/package/npm/x_ite-spz-parser/badge?style=rounded)](https://create3000.github.io/jsdelivr-download-stats/?username=create3000&repository=x_ite)
[![npm Downloads](https://img.shields.io/npm/dm/x_ite-spz-parser)](https://npmtrends.com/x_ite-spz-parser)

3DGS SPZ File Format Parser for [X_ITE](https://create3000.github.io/x_ite/)

The parser supports files with SPZ format version 1, 2 and 4.

## Usage

Include the script after X_ITE:

```html
<script defer src="https://cdn.jsdelivr.net/npm/x_ite@VERSION/dist/x_ite.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@1.0.5/dist/x_ite-spz-parser.min.js"></script>
<!-- or as ES module -->
<script type="module" src="https://cdn.jsdelivr.net/npm/x_ite@VERSION/dist/x_ite.min.mjs"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/x_ite-spz-parser@1.0.5/dist/x_ite-spz-parser.min.js"></script>
```

Now you can load 3DGS SPZ files:

```html
<x3d-canvas src="room.spz"></x3d-canvas>
```

You can also install it from npm:

```sh
npm i x_ite-spz-parser
```

## Converter

Look at the bottom part of the following page, there is a converter: https://www.nianticspatial.com/blog/spz4

## License

x_ite-spz-parser is free software and licensed under the [MIT License](LICENSE.md).
