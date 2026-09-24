# Native-canvas comparisons

`context.test.ts` has individual comparisons for both fill rules, nested clipping/transforms, each supported compositing mode, every cap/join combination, dashes, arcs, ellipses, arcTo, clearing, zero-length strokes, and offscreen layer patterns. The same drawing commands run on minicanvas and the independent Skia renderer in `@napi-rs/canvas`.

Each test asserts premultiplied RGBA error against the reference and writes a labeled comparison PNG **before** asserting. Minicanvas is on the left; Skia is on the right. The second row repeats the same scene on a dark background, exposing alpha/edge differences. Each PCB view gets the same comparison sheet; PCB references render at 4x resolution before downsampling, as documented in the test.

- Every run: `tests/output/comparisons/*.png` (ignored generated artifacts).
- Checked-in review images: `tests/snapshots/comparisons/*.png`.
- Refresh review images: `UPDATE_SNAPSHOTS=1 bun test`.
- CI uploads the current comparisons in the `canvas-comparisons` artifact on success or failure.

The reference comparisons enforce pixel-error thresholds, not byte equality of the comparison sheets: Skia antialiasing and system fonts used for sheet labels can vary across platforms. The separate minicanvas-only PCB snapshots still enforce exact PNG equality. `@napi-rs/canvas` remains a dev dependency; no reference renderer is included in the runtime package.
