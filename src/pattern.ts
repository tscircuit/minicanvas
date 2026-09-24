import { identity, type Matrix } from "./geometry"
import { MiniCanvas } from "./index"

export interface CanvasPatternSource {
  width: number
  height: number
  getContext(kind: "2d"): {
    getImageData(...bounds: [number, number, number, number]): {
      data: ArrayLike<number>
    }
  } | null
}

/** Snapshot of another canvas, used for circuit-to-canvas's offscreen layers. */
export class MiniCanvasPattern {
  readonly width: number
  readonly height: number
  readonly pixels: Float32Array
  readonly antialias: number
  matrix: Matrix = identity()

  constructor(canvas: CanvasPatternSource) {
    if (canvas instanceof MiniCanvas) {
      this.width = canvas.sampleWidth
      this.height = canvas.sampleHeight
      this.antialias = canvas.antialias
      this.pixels = canvas.pixels.slice()
    } else {
      // circuit-to-canvas chooses a DOM/OffscreenCanvas layer when available.
      // Reading that layer keeps the same API usable in browser environments.
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Pattern source has no 2D context")
      this.width = canvas.width
      this.height = canvas.height
      this.antialias = 1
      const data = context.getImageData(0, 0, this.width, this.height).data
      this.pixels = new Float32Array(this.width * this.height * 4)
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255
        for (let channel = 0; channel < 3; channel++)
          this.pixels[i + channel] = (data[i + channel] / 255) * alpha
        this.pixels[i + 3] = alpha
      }
    }
  }

  setTransform(
    matrix: {
      a?: number
      b?: number
      c?: number
      d?: number
      e?: number
      f?: number
    } = {},
  ) {
    this.matrix = [
      matrix.a ?? 1,
      matrix.b ?? 0,
      matrix.c ?? 0,
      matrix.d ?? 1,
      matrix.e ?? 0,
      matrix.f ?? 0,
    ]
  }
}
