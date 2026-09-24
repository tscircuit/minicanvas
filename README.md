# minicanvas

A small, pure TypeScript Canvas 2D rasterizer for PCB rendering. No runtime dependencies, DOM, native addons, or WASM. Works in Bun, Node, and browser bundles.

```ts
import { createCanvas } from "@tscircuit/minicanvas"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"

const canvas = createCanvas({ width: 512, height: 512 })
const drawer = new CircuitToCanvasDrawer(canvas)
drawer.setCameraBounds({ minX: -25, maxX: 25, minY: -25, maxY: 25 })
drawer.drawElements(circuitJson, {
  layers: ["top_copper", "top_silkscreen"],
  drawBoardMaterial: true,
  drawSoldermask: true,
  clearDrillHoles: true,
})

const png: Uint8Array = canvas.toPng()
const { data, width, height } = canvas.toImageData()
const dataUrl = canvas.toDataURL()
```

`new MiniCanvas(width, height)` is also supported for offscreen layer construction. `antialias` can be `1`, `2`, or `4` (default `4`); the surface is limited to 16M supersampled pixels. Resizing clears the pixels and resets the drawing state. PNG encoding uses uncompressed DEFLATE blocks for portability; callers can compress the resulting image separately if file size matters.

## Supported subset

- Paths: `beginPath`, `closePath`, `moveTo`, `lineTo`, `rect`, `arc`, `arcTo`, `ellipse`, `fill`, `stroke`.
- Nonzero/even-odd fills and nested clips, with `save`/`restore`.
- Affine transforms: translate, rotate, scale, transform, set/reset/get transform.
- Stroke widths, caps, joins, miter limits, dash arrays and offsets.
- Solid hex, RGB/RGBA and basic named colors; global alpha.
- `source-over`, `source-atop`, `destination-over`, `destination-in`, `destination-out`, `copy`, `xor`, `lighter`.
- Non-repeating canvas snapshot patterns for offscreen layer compositing.
- Fill/stroke/clear rectangles, integer-coordinate `getImageData`, RGBA/PNG/data URL output.

This is a deliberate subset, not a complete browser Canvas replacement. Gradients, repeated patterns, image decoding/drawImage, shadows, filters, Bézier curves, Path2D, and system-font text are not implemented. `fillText` and `measureText` throw; circuit-to-canvas renders its PCB lettering as glyph paths. Unsupported color/compositing/pattern modes throw rather than silently producing the wrong image.

## Tests

```sh
bun install
bun test
bun run typecheck
bun run build
# After visually reviewing intended rendering changes:
UPDATE_SNAPSHOTS=1 bun test tests/pcb.test.ts
```

The native canvas package is **test-only**: it supplies an independent Skia reference and PNG decoder. Tests cover individual drawing operations and three offline PCB fixtures, with four views per snapshot: top/bottom soldermask overviews and top/bottom copper/paste details. PCB comparisons use a 4× native reference to reduce accumulated edge-coverage differences on dense copper. They require mean premultiplied RGBA error below 3/255 and fewer than 1.5% of pixels differing by more than 64/255 in any channel, in addition to exact stored snapshot comparisons. Fixture sources are recorded in [tests/fixtures/README.md](tests/fixtures/README.md).
