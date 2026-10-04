import { expect, test } from "bun:test"
import { compareDrawing } from "./helpers/compare"
import { createCanvas } from "../src"

for (const offset of [0, 5, -5, 16]) {
  test(`round zero-length dashes remain visible with offset ${offset}`, () => {
    const canvas = compareDrawing(
      (context) => {
        context.lineWidth = 10
        context.lineCap = "round"
        context.strokeStyle = "#1864ab"
        context.setLineDash([0, 16])
        context.lineDashOffset = offset
        context.beginPath()
        context.moveTo(16, 24)
        context.lineTo(112, 24)
        context.stroke()
        context.beginPath()
        context.moveTo(16, 56)
        context.lineTo(64, 56)
        context.lineTo(64, 104)
        context.stroke()
      },
      { name: `round-zero-dashes-offset-${offset}`, limit: 0.5 },
    )
    const firstDot = 16 + ((16 - (offset % 16)) % 16)
    expect(
      canvas.getContext("2d").getImageData(firstDot, 24, 1, 1).data[3],
    ).toBe(255)
  })
}

test("round zero-length dashes can alternate with nonzero dashes", () => {
  compareDrawing(
    (context) => {
      context.lineWidth = 8
      context.lineCap = "round"
      context.setLineDash([8, 8, 0, 8])
      context.beginPath()
      context.moveTo(16, 24)
      context.lineTo(112, 24)
      context.stroke()
      context.translate(16, 64)
      context.scale(1.2, 0.7)
      context.rotate(0.25)
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(80, 0)
      context.stroke()
    },
    { name: "round-mixed-zero-dashes", limit: 0.5 },
  )
})

test("zero-length butt dashes remain empty", () => {
  const canvas = compareDrawing(
    (context) => {
      context.lineWidth = 8
      context.setLineDash([0, 16])
      context.beginPath()
      context.moveTo(16, 24)
      context.lineTo(112, 24)
      context.stroke()
    },
    { name: "zero-dashes-butt", limit: 0.5 },
  )
  const context = canvas.getContext("2d")
  expect(context.getImageData(16, 24, 1, 1).data[3]).toBe(0)
})

test("round dots survive closed paths and odd dash-array normalization", () => {
  compareDrawing(
    (context) => {
      context.lineWidth = 8
      context.lineCap = "round"
      context.setLineDash([0, 16])
      context.beginPath()
      context.rect(16, 16, 48, 48)
      context.stroke()
      context.setLineDash([0, 8, 4])
      context.beginPath()
      context.moveTo(16, 104)
      context.lineTo(112, 104)
      context.stroke()
    },
    { name: "round-zero-dashes-closed-and-odd", limit: 0.5 },
  )
})

test("all-zero dash arrays still draw a solid stroke", () => {
  // The native reference rejects an all-zero array when stroking.
  const canvas = createCanvas({ width: 32, height: 32 })
  const context = canvas.getContext("2d")
  context.lineWidth = 8
  context.setLineDash([0, 0])
  context.beginPath()
  context.moveTo(4, 16)
  context.lineTo(28, 16)
  context.stroke()
  expect(context.getImageData(16, 16, 1, 1).data[3]).toBe(255)
})
