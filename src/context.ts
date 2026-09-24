import {
  identity,
  inverse,
  multiply,
  transform,
  distance,
  type Matrix,
  type Point,
  type Subpath,
} from "./geometry"
import { parseColor } from "./color"
import { scan, paint, type FillRule, type Composite } from "./raster"
import { strokePolygons } from "./stroke"
import type { MiniCanvas } from "./index"
import { MiniCanvasPattern, type CanvasPatternSource } from "./pattern"

type TextAlign = "start" | "end" | "left" | "right" | "center"
type TextBaseline =
  | "top"
  | "hanging"
  | "middle"
  | "alphabetic"
  | "ideographic"
  | "bottom"

type State = {
  matrix: Matrix
  clip: Uint8Array | null
  fillStyle: string | MiniCanvasPattern
  strokeStyle: string | MiniCanvasPattern
  globalAlpha: number
  operation: Composite
  lineWidth: number
  lineCap: "butt" | "round" | "square"
  lineJoin: "miter" | "round" | "bevel"
  miterLimit: number
  dash: number[]
  lineDashOffset: number
  font: string
  textAlign: TextAlign
  textBaseline: TextBaseline
}
const initial = (): State => ({
  matrix: identity(),
  clip: null,
  fillStyle: "#000000",
  strokeStyle: "#000000",
  globalAlpha: 1,
  operation: "source-over",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
  dash: [],
  lineDashOffset: 0,
  font: "10px sans-serif",
  textAlign: "start",
  textBaseline: "alphabetic",
})
export class MiniCanvasContext {
  private state = initial()
  private stack: State[] = []
  private paths: Subpath[] = []
  constructor(readonly canvas: MiniCanvas) {}
  reset() {
    this.state = initial()
    this.stack = []
    this.paths = []
  }
  get fillStyle(): string | MiniCanvasPattern {
    return this.state.fillStyle
  }
  set fillStyle(value: string | MiniCanvasPattern) {
    if (typeof value !== "string" && !(value instanceof MiniCanvasPattern))
      throw new Error(
        "MiniCanvas supports solid colors and MiniCanvas patterns only",
      )
    if (typeof value === "string") parseColor(value)
    this.state.fillStyle = value
  }
  get strokeStyle(): string | MiniCanvasPattern {
    return this.state.strokeStyle
  }
  set strokeStyle(value: string | MiniCanvasPattern) {
    if (typeof value !== "string" && !(value instanceof MiniCanvasPattern))
      throw new Error(
        "MiniCanvas supports solid colors and MiniCanvas patterns only",
      )
    if (typeof value === "string") parseColor(value)
    this.state.strokeStyle = value
  }
  createPattern(canvas: CanvasPatternSource, repetition: string | null) {
    if (repetition !== "no-repeat")
      throw new Error("Only no-repeat canvas patterns are supported")
    return new MiniCanvasPattern(canvas)
  }
  get globalAlpha() {
    return this.state.globalAlpha
  }
  set globalAlpha(v: number) {
    if (Number.isFinite(v) && v >= 0 && v <= 1) this.state.globalAlpha = v
  }
  get globalCompositeOperation(): string {
    return this.state.operation
  }
  set globalCompositeOperation(value: string) {
    if (
      ![
        "source-over",
        "source-atop",
        "destination-out",
        "destination-in",
        "copy",
        "destination-over",
        "xor",
        "lighter",
      ].includes(value)
    )
      throw new Error(`Unsupported compositing operation: ${value}`)
    this.state.operation = value as Composite
  }
  get lineWidth() {
    return this.state.lineWidth
  }
  set lineWidth(v: number) {
    if (Number.isFinite(v) && v > 0) this.state.lineWidth = v
  }
  get lineCap() {
    return this.state.lineCap
  }
  set lineCap(v: "butt" | "round" | "square") {
    this.state.lineCap = v
  }
  get lineJoin() {
    return this.state.lineJoin
  }
  set lineJoin(v: "miter" | "round" | "bevel") {
    this.state.lineJoin = v
  }
  get miterLimit() {
    return this.state.miterLimit
  }
  set miterLimit(v: number) {
    if (Number.isFinite(v) && v > 0) this.state.miterLimit = v
  }
  get lineDashOffset() {
    return this.state.lineDashOffset
  }
  set lineDashOffset(v: number) {
    if (Number.isFinite(v)) this.state.lineDashOffset = v
  }
  get font() {
    return this.state.font
  }
  set font(v: string) {
    this.state.font = v
  }
  get textAlign() {
    return this.state.textAlign
  }
  set textAlign(v: TextAlign) {
    this.state.textAlign = v
  }
  get textBaseline() {
    return this.state.textBaseline
  }
  set textBaseline(v: TextBaseline) {
    this.state.textBaseline = v
  }
  /** circuit-to-canvas draws text as paths. System-font text is deliberately unsupported. */
  fillText(
    ..._args: [text: string, x: number, y: number, maxWidth?: number]
  ): never {
    throw new Error("fillText is not supported; draw glyph paths instead")
  }
  measureText(_text: string): never {
    throw new Error("measureText is not supported; use glyph metrics")
  }
  save() {
    this.stack.push({
      ...this.state,
      matrix: [...this.state.matrix],
      dash: [...this.state.dash],
    })
  }
  restore() {
    const saved = this.stack.pop()
    if (saved) this.state = saved
  }
  setLineDash(segments: number[]) {
    if (segments.some((v) => !Number.isFinite(v) || v < 0)) return
    this.state.dash =
      segments.length % 2 ? [...segments, ...segments] : [...segments]
  }
  getLineDash() {
    return [...this.state.dash]
  }
  translate(x: number, y: number) {
    this.state.matrix = multiply(this.state.matrix, [1, 0, 0, 1, x, y])
  }
  scale(x: number, y: number) {
    this.state.matrix = multiply(this.state.matrix, [x, 0, 0, y, 0, 0])
  }
  rotate(angle: number) {
    const c = Math.cos(angle),
      s = Math.sin(angle)
    this.state.matrix = multiply(this.state.matrix, [c, s, -s, c, 0, 0])
  }
  transform(...matrix: Matrix) {
    this.state.matrix = multiply(this.state.matrix, matrix)
  }
  setTransform(...matrix: Matrix) {
    this.state.matrix = [...matrix]
  }
  resetTransform() {
    this.state.matrix = identity()
  }
  getTransform() {
    const [a, b, c, d, e, f] = this.state.matrix
    return { a, b, c, d, e, f }
  }
  beginPath() {
    this.paths = []
  }
  closePath() {
    const path = this.paths.at(-1)
    if (path?.points.length) path.closed = true
  }
  moveTo(x: number, y: number) {
    if (Number.isFinite(x) && Number.isFinite(y))
      this.paths.push({
        points: [transform({ x, y }, this.state.matrix)],
        closed: false,
      })
  }
  lineTo(x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    let path = this.paths.at(-1)
    if (!path) {
      this.moveTo(x, y)
      return
    }
    if (path.closed) {
      path = { points: [path.points[0]], closed: false }
      this.paths.push(path)
    }
    path.points.push(transform({ x, y }, this.state.matrix))
  }
  rect(...[x, y, w, h]: [number, number, number, number]) {
    this.moveTo(x, y)
    this.lineTo(x + w, y)
    this.lineTo(x + w, y + h)
    this.lineTo(x, y + h)
    this.closePath()
    this.moveTo(x, y)
  }
  arc(
    ...[x, y, r, start, end, ccw = false]: [
      number,
      number,
      number,
      number,
      number,
      boolean?,
    ]
  ) {
    this.ellipse(x, y, r, r, 0, start, end, ccw)
  }
  ellipse(
    ...[x, y, rx, ry, rotation, start, end, ccw = false]: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      boolean?,
    ]
  ) {
    if (rx < 0 || ry < 0) throw new RangeError("Negative arc radius")
    if (![x, y, rx, ry, rotation, start, end].every(Number.isFinite)) return
    const tau = 2 * Math.PI
    let delta = end - start
    if (!ccw) {
      delta = delta >= tau ? tau : ((delta % tau) + tau) % tau
    } else {
      delta = -delta >= tau ? -tau : -(((-delta % tau) + tau) % tau)
    }
    const m = this.state.matrix,
      scale = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])),
      r = Math.max(rx, ry) * scale
    const step =
      2 *
      Math.acos(
        Math.max(-1, 1 - 0.1 / (Math.max(r, 0.1) * this.canvas.antialias)),
      )
    const count = Math.max(1, Math.ceil(Math.abs(delta) / step)),
      c = Math.cos(rotation),
      s = Math.sin(rotation)
    for (let i = 0; i <= count; i++) {
      const angle = start + (delta * i) / count,
        px = rx * Math.cos(angle),
        py = ry * Math.sin(angle)
      this.lineTo(x + c * px - s * py, y + s * px + c * py)
    }
  }
  arcTo(...[x1, y1, x2, y2, r]: [number, number, number, number, number]) {
    if (r < 0) throw new RangeError("Negative arc radius")
    if (![x1, y1, x2, y2, r].every(Number.isFinite)) return
    const path = this.paths.at(-1),
      inv = inverse(this.state.matrix)
    if (!path) {
      this.moveTo(x1, y1)
      return
    }
    if (!inv) return
    const p0 = transform(
        path.closed ? path.points[0] : path.points.at(-1)!,
        inv,
      ),
      p1 = { x: x1, y: y1 },
      p2 = { x: x2, y: y2 },
      d0 = distance(p0, p1),
      d1 = distance(p1, p2)
    if (!d0 || !d1 || !r) {
      this.lineTo(x1, y1)
      return
    }
    const u = { x: (p0.x - x1) / d0, y: (p0.y - y1) / d0 },
      v = { x: (x2 - x1) / d1, y: (y2 - y1) / d1 },
      cross = u.x * v.y - u.y * v.x,
      dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y))
    if (Math.abs(cross) < 1e-12) {
      this.lineTo(x1, y1)
      return
    }
    const angle = Math.acos(dot),
      t = r / Math.tan(angle / 2),
      a = { x: x1 + u.x * t, y: y1 + u.y * t },
      b = { x: x1 + v.x * t, y: y1 + v.y * t },
      factor = r / Math.sin(angle / 2) / Math.hypot(u.x + v.x, u.y + v.y),
      center = { x: x1 + (u.x + v.x) * factor, y: y1 + (u.y + v.y) * factor }
    this.lineTo(a.x, a.y)
    this.arc(
      center.x,
      center.y,
      r,
      Math.atan2(a.y - center.y, a.x - center.x),
      Math.atan2(b.y - center.y, b.x - center.x),
      cross > 0,
    )
  }
  private draw(
    polygons: Point[][],
    options: {
      rule?: FillRule
      color: string | MiniCanvasPattern
      clear?: boolean
    },
  ) {
    const canvas = this.canvas,
      width = canvas.sampleWidth,
      height = canvas.sampleHeight
    const spans = scan({
      polygons,
      width,
      height,
      rule: options.rule,
      scale: canvas.antialias,
    })
    const pattern =
      options.color instanceof MiniCanvasPattern ? options.color : null
    const patternInverse = pattern
      ? inverse(multiply(this.state.matrix, pattern.matrix))
      : null
    const color = pattern
      ? ([0, 0, 0, 0] as [number, number, number, number])
      : parseColor(options.color as string)
    color[3] *= options.clear ? 1 : this.globalAlpha
    const sample =
      pattern && patternInverse
        ? (point: Point) => {
            const local = transform(
              { x: point.x / canvas.antialias, y: point.y / canvas.antialias },
              patternInverse,
            )
            const x = Math.floor(local.x * pattern.antialias)
            const y = Math.floor(local.y * pattern.antialias)
            if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height)
              return [0, 0, 0, 0] as const
            const i = (y * pattern.width + x) * 4
            return [
              pattern.pixels[i] * this.globalAlpha,
              pattern.pixels[i + 1] * this.globalAlpha,
              pattern.pixels[i + 2] * this.globalAlpha,
              pattern.pixels[i + 3] * this.globalAlpha,
            ] as const
          }
        : undefined
    paint({
      spans,
      pixels: canvas.pixels,
      width,
      height,
      color,
      sample,
      clip: this.state.clip,
      operation: options.clear ? "destination-out" : this.state.operation,
    })
  }
  fill(rule: FillRule = "nonzero") {
    this.draw(
      this.paths.map((p) => p.points),
      { rule, color: this.fillStyle },
    )
  }
  stroke() {
    const inv = inverse(this.state.matrix)
    if (!inv) return
    const m = this.state.matrix,
      scale = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]))
    const paths = this.paths.map((p) => ({
      ...p,
      points: p.points.map((point) => transform(point, inv)),
    }))
    const polygons = strokePolygons(paths, {
      width: this.lineWidth,
      cap: this.lineCap,
      join: this.lineJoin,
      miterLimit: this.miterLimit,
      dash: this.state.dash,
      offset: this.lineDashOffset,
      tolerance: 0.1 / (scale * this.canvas.antialias),
    }).map((points) => points.map((p) => transform(p, m)))
    this.draw(polygons, { color: this.strokeStyle })
  }
  clip(rule: FillRule = "nonzero") {
    const width = this.canvas.sampleWidth,
      height = this.canvas.sampleHeight,
      mask = new Uint8Array(width * height)
    for (const span of scan({
      polygons: this.paths.map((p) => p.points),
      width,
      height,
      rule,
      scale: this.canvas.antialias,
    }))
      mask.fill(1, span.y * width + span.left, span.y * width + span.right)
    if (this.state.clip)
      for (let i = 0; i < mask.length; i++) mask[i] &= this.state.clip[i]
    this.state.clip = mask
  }
  private rectangle(args: [number, number, number, number]): Point[][] {
    const [x, y, w, h] = args
    return [
      [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ].map((p) => transform(p, this.state.matrix)),
    ]
  }
  fillRect(...args: [number, number, number, number]) {
    this.draw(this.rectangle(args), { color: this.fillStyle })
  }
  clearRect(...args: [number, number, number, number]) {
    this.draw(this.rectangle(args), { color: "#000000", clear: true })
  }
  strokeRect(...args: [number, number, number, number]) {
    const saved = this.paths
    this.beginPath()
    this.rect(...args)
    this.stroke()
    this.paths = saved
  }
  getImageData(...[x, y, width, height]: [number, number, number, number]) {
    if (
      ![x, y, width, height].every(Number.isInteger) ||
      width <= 0 ||
      height <= 0
    )
      throw new RangeError(
        "getImageData requires integer coordinates and positive dimensions",
      )
    const full = this.canvas.toImageData(),
      data = new Uint8ClampedArray(width * height * 4)
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) {
        const sx = x + dx,
          sy = y + dy
        if (
          sx >= 0 &&
          sy >= 0 &&
          sx < this.canvas.width &&
          sy < this.canvas.height
        )
          data.set(
            full.data.subarray(
              (sy * this.canvas.width + sx) * 4,
              (sy * this.canvas.width + sx) * 4 + 4,
            ),
            (dy * width + dx) * 4,
          )
      }
    return { width, height, data }
  }
}
