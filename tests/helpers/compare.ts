import { expect } from "bun:test"
import { createCanvas as createNativeCanvas } from "@napi-rs/canvas"
import { createCanvas, type MiniCanvasContext } from "../../src"

export function compareDrawing(
  draw: (context: MiniCanvasContext) => void,
  limit = 2,
) {
  const canvas = createCanvas({ width: 128, height: 128, antialias: 4 })
  const reference = createNativeCanvas(128, 128)
  draw(canvas.getContext("2d"))
  draw(reference.getContext("2d") as unknown as MiniCanvasContext)
  const actual = canvas.toImageData().data
  const expected = reference.getContext("2d").getImageData(0, 0, 128, 128).data
  const error = pixelError(actual, expected)
  expect(error.mean).toBeLessThan(limit)
  expect(error.largeDifferenceFraction).toBeLessThan(0.02)
  return canvas
}

/** Compare premultiplied RGBA: RGB in fully transparent pixels is immaterial. */
export function pixelError(
  actual: Uint8ClampedArray,
  expected: Uint8ClampedArray,
) {
  let sum = 0
  let largeDifferences = 0
  for (let i = 0; i < actual.length; i += 4) {
    let max = 0
    for (let c = 0; c < 4; c++) {
      const a = actual[i + c] * (c === 3 ? 1 : actual[i + 3] / 255)
      const b = expected[i + c] * (c === 3 ? 1 : expected[i + 3] / 255)
      const difference = Math.abs(a - b)
      sum += difference
      max = Math.max(max, difference)
    }
    if (max > 64) largeDifferences++
  }
  return {
    mean: sum / actual.length,
    largeDifferenceFraction: largeDifferences / (actual.length / 4),
  }
}
