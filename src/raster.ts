import type { Point } from "./geometry"
import type { Color } from "./color"
export type FillRule = "nonzero" | "evenodd"
export type Composite =
  | "source-over"
  | "source-atop"
  | "destination-out"
  | "destination-in"
  | "copy"
  | "destination-over"
  | "xor"
  | "lighter"
export type Span = { y: number; left: number; right: number }
/** Half-open edges and pixel-center sampling avoid cracks at shared vertices. */
export function scan({
  polygons,
  width,
  height,
  rule = "nonzero",
  scale,
}: {
  polygons: Point[][]
  width: number
  height: number
  rule?: FillRule
  scale: number
}): Span[] {
  const edges: { x0: number; y0: number; x1: number; y1: number; w: number }[] =
    []
  let minY = height,
    maxY = 0
  for (const points of polygons)
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length]
      if (a.y === b.y) continue
      const low = a.y < b.y ? a : b,
        high = a.y < b.y ? b : a
      const y0 = low.y * scale,
        y1 = high.y * scale
      edges.push({
        x0: low.x * scale,
        y0,
        x1: high.x * scale,
        y1,
        w: a.y < b.y ? 1 : -1,
      })
      minY = Math.min(minY, y0)
      maxY = Math.max(maxY, y1)
    }
  const spans: Span[] = []
  for (
    let y = Math.max(0, Math.ceil(minY - 0.5));
    y < Math.min(height, Math.ceil(maxY - 0.5));
    y++
  ) {
    const hits: { x: number; w: number }[] = []
    for (const e of edges)
      if (y + 0.5 >= e.y0 && y + 0.5 < e.y1)
        hits.push({
          x: e.x0 + ((y + 0.5 - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0),
          w: e.w,
        })
    hits.sort((a, b) => a.x - b.x)
    let winding = 0,
      start = 0
    for (const hit of hits) {
      const before =
        rule === "evenodd" ? Math.abs(winding) % 2 !== 0 : winding !== 0
      winding += hit.w
      const after =
        rule === "evenodd" ? Math.abs(winding) % 2 !== 0 : winding !== 0
      if (!before && after) start = hit.x
      if (before && !after) {
        const left = Math.max(0, Math.ceil(start - 0.5)),
          right = Math.min(width, Math.ceil(hit.x - 0.5))
        if (right > left) spans.push({ y, left, right })
      }
    }
  }
  return spans
}
export function paint({
  spans,
  pixels,
  width,
  height,
  color,
  sample,
  clip,
  operation,
}: {
  spans: Span[]
  pixels: Float32Array
  width: number
  height: number
  color: Color
  sample?: (point: Point) => readonly [number, number, number, number]
  clip: Uint8Array | null
  operation: Composite
}): void {
  // These Porter-Duff modes clear destination outside the source, within clip.
  if (operation === "destination-in" || operation === "copy") {
    const coverage = new Uint8Array(width * height)
    for (const s of spans)
      coverage.fill(1, s.y * width + s.left, s.y * width + s.right)
    for (let i = 0; i < coverage.length; i++)
      if (!coverage[i] && (!clip || clip[i])) pixels.fill(0, i * 4, i * 4 + 4)
  }
  const solidAlpha = color[3],
    solidRed = color[0] * solidAlpha,
    solidGreen = color[1] * solidAlpha,
    solidBlue = color[2] * solidAlpha
  for (const span of spans)
    for (let x = span.left; x < span.right; x++) {
      const index = span.y * width + x
      if (clip && !clip[index]) continue
      const i = index * 4,
        da = pixels[i + 3]
      const [sr, sg, sb, sa] = sample?.({ x: x + 0.5, y: span.y + 0.5 }) ?? [
        solidRed,
        solidGreen,
        solidBlue,
        solidAlpha,
      ]
      let source = 1,
        destination = 1 - sa
      if (operation === "source-atop") {
        source = da
        destination = 1 - sa
      }
      if (operation === "destination-out") {
        source = 0
        destination = 1 - sa
      }
      if (operation === "destination-in") {
        source = 0
        destination = sa
      }
      if (operation === "copy") {
        source = 1
        destination = 0
      }
      if (operation === "destination-over") {
        source = 1 - da
        destination = 1
      }
      if (operation === "xor") {
        source = 1 - da
        destination = 1 - sa
      }
      if (operation === "lighter") {
        source = 1
        destination = 1
      }
      pixels[i] = Math.min(1, sr * source + pixels[i] * destination)
      pixels[i + 1] = Math.min(1, sg * source + pixels[i + 1] * destination)
      pixels[i + 2] = Math.min(1, sb * source + pixels[i + 2] * destination)
      pixels[i + 3] = Math.min(1, sa * source + da * destination)
    }
}
