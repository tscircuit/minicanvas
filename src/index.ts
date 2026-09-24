import { MiniCanvasContext } from "./context"
import { encodePng, toBase64 } from "./png"
export { MiniCanvasContext } from "./context"
export type MiniCanvasOptions = {
  width: number
  height: number
  antialias?: 1 | 2 | 4
}
/** Canvas 2D subset with a supersampled, premultiplied-alpha software surface. */
export class MiniCanvas {
  private _width: number
  private _height: number
  readonly antialias: 1 | 2 | 4
  pixels: Float32Array
  private context: MiniCanvasContext
  constructor(options: MiniCanvasOptions)
  constructor(width: number, height: number)
  constructor(options: MiniCanvasOptions | number, canvasHeight?: number) {
    const {
      width,
      height,
      antialias = 4,
    } = typeof options === "number"
      ? { width: options, height: canvasHeight! }
      : options
    if (![1, 2, 4].includes(antialias))
      throw new RangeError("antialias must be 1, 2, or 4")
    this._width = width
    this._height = height
    this.antialias = antialias
    this.validate(width, height)
    this.pixels = new Float32Array(this.sampleWidth * this.sampleHeight * 4)
    this.context = new MiniCanvasContext(this)
  }
  private validate(width: number, height: number) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height * this.antialias ** 2 > 16_777_216
    )
      throw new RangeError(
        "Canvas dimensions must be positive integers, at most 16M supersampled pixels",
      )
  }
  get width() {
    return this._width
  }
  set width(value: number) {
    this.resize(value, this.height)
  }
  get height() {
    return this._height
  }
  set height(value: number) {
    this.resize(this.width, value)
  }
  get sampleWidth() {
    return this.width * this.antialias
  }
  get sampleHeight() {
    return this.height * this.antialias
  }
  private resize(width: number, height: number) {
    this.validate(width, height)
    this._width = width
    this._height = height
    this.pixels = new Float32Array(this.sampleWidth * this.sampleHeight * 4)
    this.context.reset()
  }
  getContext(kind: "2d"): MiniCanvasContext
  getContext(kind: string): MiniCanvasContext | null
  getContext(kind: string) {
    return kind === "2d" ? this.context : null
  }
  toImageData() {
    const data = new Uint8ClampedArray(this.width * this.height * 4),
      s = this.antialias,
      n = s * s
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const sums = [0, 0, 0, 0]
        for (let dy = 0; dy < s; dy++)
          for (let dx = 0; dx < s; dx++) {
            const i = ((y * s + dy) * this.sampleWidth + x * s + dx) * 4
            for (let c = 0; c < 4; c++) sums[c] += this.pixels[i + c]
          }
        const i = (y * this.width + x) * 4
        for (let c = 0; c < 3; c++)
          data[i + c] = sums[3] > 0 ? (255 * sums[c]) / sums[3] : 0
        data[i + 3] = (255 * sums[3]) / n
      }
    return { width: this.width, height: this.height, data }
  }
  toPng() {
    return encodePng(this.toImageData())
  }
  toDataURL(type = "image/png") {
    if (type !== "image/png") throw new Error("Only image/png is supported")
    return "data:image/png;base64," + toBase64(this.toPng())
  }
}
export function createCanvas(options: MiniCanvasOptions) {
  return new MiniCanvas(options)
}
