import { test, expect } from "bun:test"
import { createCanvas as nativeCanvas, loadImage } from "@napi-rs/canvas"
import { createCanvas } from "../src"
import { inflateSync } from "node:zlib"
import { pixelError } from "./helpers/compare"
import { compareDrawing } from "./helpers/compare"

for (const rule of ["nonzero", "evenodd"] as const) {
  test(`nested polygons and ${rule} fill`, () => {
    const canvas = compareDrawing(
      (c) => {
        c.fillStyle = "#db712a"
        c.beginPath()
        c.rect(8, 8, 110, 110)
        c.rect(30, 30, 60, 60)
        c.fill(rule)
      },
      { name: `fill-${rule}` },
    )
    expect(canvas.getContext("2d").getImageData(50, 50, 1, 1).data[3]).toBe(
      rule === "evenodd" ? 0 : 255,
    )
  })
}

test("path transforms captured at construction; nested clip and restore", () => {
  compareDrawing(
    (c) => {
      c.translate(64, 64)
      c.rotate(0.35)
      c.scale(1.2, 0.7)
      c.beginPath()
      c.rect(-40, -40, 80, 80)
      c.save()
      c.clip()
      c.resetTransform()
      c.fillStyle = "red"
      c.fillRect(0, 0, 128, 128)
      c.save()
      c.beginPath()
      c.arc(64, 64, 30, 0, Math.PI * 2)
      c.clip()
      c.fillStyle = "blue"
      c.fillRect(0, 0, 128, 128)
      c.restore()
      c.fillStyle = "#0f08"
      c.fillRect(5, 50, 115, 12)
      c.restore()
      c.fillStyle = "white"
      c.fillRect(0, 0, 4, 4)
    },
    { name: "transforms-nested-clip" },
  )
})

for (const operation of [
  "source-over",
  "source-atop",
  "destination-out",
  "destination-in",
  "destination-over",
  "copy",
  "xor",
  "lighter",
]) {
  test(`Porter-Duff ${operation} with partial alpha and clipping`, () => {
    compareDrawing(
      (c) => {
        c.fillStyle = "rgba(255,0,0,0.6)"
        c.fillRect(10, 10, 80, 80)
        c.beginPath()
        c.rect(5, 5, 115, 100)
        c.clip()
        c.globalCompositeOperation = operation
        c.globalAlpha = 0.7
        c.fillStyle = "#0080ffcc"
        c.fillRect(50, 45, 70, 70)
      },
      { name: `composite-${operation}`, limit: 0.6 },
    )
  })
}

for (const cap of ["butt", "round", "square"] as const) {
  for (const join of ["miter", "round", "bevel"] as const) {
    test(`strokes: ${cap} caps, ${join} joins, dashes and nonuniform scale`, () => {
      compareDrawing(
        (c) => {
          c.translate(9, 8)
          c.scale(1.2, 0.8)
          c.lineWidth = 8
          c.lineCap = cap
          c.lineJoin = join
          c.strokeStyle = "#2776ccaa"
          c.beginPath()
          c.moveTo(5, 10)
          c.lineTo(50, 45)
          c.lineTo(75, 10)
          c.stroke()
          c.setLineDash([7, 3, 4])
          c.lineDashOffset = -5
          c.beginPath()
          c.moveTo(3, 80)
          c.lineTo(70, 65)
          c.lineTo(85, 120)
          c.stroke()
          c.setLineDash([])
          c.miterLimit = 2
          c.beginPath()
          c.moveTo(10, 120)
          c.lineTo(30, 90)
          c.lineTo(32, 120)
          c.stroke()
        },
        { name: `stroke-${cap}-${join}` },
      )
    })
  }
}

test("arcs, counterclockwise arcs, rotated ellipses and arcTo", () => {
  compareDrawing(
    (c) => {
      c.fillStyle = "#fc6"
      c.beginPath()
      c.ellipse(35, 35, 28, 13, 0.7, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = "#046"
      c.lineWidth = 4
      c.beginPath()
      c.arc(90, 35, 22, 0, -Math.PI * 1.5, true)
      c.stroke()
      c.beginPath()
      c.moveTo(10, 100)
      c.arcTo(50, 70, 70, 120, 15)
      c.lineTo(70, 120)
      c.stroke()
      c.beginPath()
      c.moveTo(90, 110)
      c.arcTo(70, 60, 125, 85, 10)
      c.stroke()
    },
    { name: "arcs-ellipses-tangents" },
  )
})

test("clearRect ignores alpha/composite, honors clip, and leaves path intact", () => {
  compareDrawing(
    (c) => {
      c.fillStyle = "orange"
      c.fillRect(0, 0, 128, 128)
      c.beginPath()
      c.rect(20, 20, 80, 80)
      c.clip()
      c.globalAlpha = 0.1
      c.globalCompositeOperation = "source-atop"
      c.clearRect(10, 10, 50, 60)
      c.globalAlpha = 1
      c.strokeStyle = "blue"
      c.stroke()
    },
    { name: "clear-rect-clipped" },
  )
})

test("unused moveTo produces no round dot; zero length line produces a dot", () => {
  compareDrawing(
    (c) => {
      c.lineCap = "round"
      c.lineWidth = 12
      c.beginPath()
      c.moveTo(30, 30)
      c.stroke()
      c.beginPath()
      c.moveTo(70, 70)
      c.lineTo(70, 70)
      c.stroke()
    },
    { name: "zero-length-strokes" },
  )
})

test("no-repeat layer pattern composites without erasing copper beneath", () => {
  const canvas = createCanvas({ width: 32, height: 32, antialias: 1 })
  const c = canvas.getContext("2d")
  c.fillStyle = "red"
  c.fillRect(0, 0, 32, 32)
  const layer = new (canvas.constructor as typeof import("../src").MiniCanvas)(
    32,
    32,
  )
  const l = layer.getContext("2d")
  l.fillStyle = "blue"
  l.fillRect(5, 5, 20, 20)
  l.globalCompositeOperation = "destination-out"
  l.fillRect(10, 10, 10, 10)
  c.fillStyle = c.createPattern(layer, "no-repeat")
  c.fillRect(0, 0, 32, 32)
  expect([...c.getImageData(12, 12, 1, 1).data]).toEqual([255, 0, 0, 255])
  expect([...c.getImageData(6, 6, 1, 1).data]).toEqual([0, 0, 255, 255])
  expect([...c.getImageData(1, 1, 1, 1).data]).toEqual([255, 0, 0, 255])
})

test("PNG round trip across multiple DEFLATE blocks and portable data URL", async () => {
  const canvas = createCanvas({ width: 200, height: 180 })
  const c = canvas.getContext("2d")
  c.fillStyle = "#a3f8"
  c.fillRect(0, 0, 200, 180)
  c.clearRect(4, 8, 5, 20)
  const png = canvas.toPng()
  const image = await loadImage(Buffer.from(png))
  const decoded = nativeCanvas(200, 180)
  decoded.getContext("2d").drawImage(image, 0, 0)
  expect(
    pixelError(
      decoded.getContext("2d").getImageData(0, 0, 200, 180).data,
      canvas.toImageData().data,
    ).mean,
  ).toBeLessThan(0.3)
  // Verify exact straight-alpha bytes before a native decoder premultiplies them.
  const idatLength = new DataView(png.buffer, png.byteOffset).getUint32(33)
  const rows = inflateSync(png.subarray(41, 41 + idatLength))
  const original = canvas.toImageData().data
  for (let y = 0; y < 180; y++) {
    expect(rows[y * 801]).toBe(0)
    expect(
      Buffer.compare(
        rows.subarray(y * 801 + 1, (y + 1) * 801),
        Buffer.from(original.subarray(y * 800, (y + 1) * 800)),
      ),
    ).toBe(0)
  }
  expect(canvas.toDataURL()).toBe(
    `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
  )
})

test("resize resets pixels, clipping, transform and state on same context", () => {
  const canvas = createCanvas({ width: 8, height: 8 })
  const c = canvas.getContext("2d")
  c.fillStyle = "red"
  c.fillRect(0, 0, 8, 8)
  c.translate(4, 4)
  c.save()
  c.beginPath()
  c.rect(0, 0, 1, 1)
  c.clip()
  canvas.width = 8
  c.restore()
  expect(canvas.getContext("2d")).toBe(c)
  expect(canvas.toImageData().data.every((v) => v === 0)).toBe(true)
  expect(c.fillStyle).toBe("#000000")
  expect(c.getTransform().e).toBe(0)
  c.fillRect(0, 0, 8, 8)
  expect(c.getImageData(7, 7, 1, 1).data[3]).toBe(255)
})

test("pattern accepts browser-style canvas sources and applies its transform", () => {
  const source = nativeCanvas(8, 8)
  source.getContext("2d").fillStyle = "blue"
  source.getContext("2d").fillRect(0, 0, 8, 8)
  const canvas = createCanvas({ width: 32, height: 32 })
  const c = canvas.getContext("2d")
  const pattern = c.createPattern(source, "no-repeat")
  pattern.setTransform({ e: 10, f: 12 })
  c.fillStyle = pattern
  c.globalAlpha = 0.5
  c.fillRect(0, 0, 32, 32)
  expect([...c.getImageData(12, 14, 1, 1).data]).toEqual([0, 0, 255, 128])
  expect(c.getImageData(3, 3, 1, 1).data[3]).toBe(0)
})

test("path coordinates survive resetTransform before fill", () => {
  // Skia's resetTransform currently drops its current path. Assert these Canvas
  // semantics analytically rather than inheriting that reference limitation.
  const canvas = createCanvas({ width: 32, height: 32 })
  const c = canvas.getContext("2d")
  c.translate(10, 10)
  c.beginPath()
  c.rect(0, 0, 8, 8)
  c.resetTransform()
  c.fill()
  expect(c.getImageData(12, 12, 1, 1).data[3]).toBe(255)
  expect(c.getImageData(3, 3, 1, 1).data[3]).toBe(0)
})

for (const shape of ["arc", "ellipse", "arcTo"] as const) {
  test(`individual ${shape} native comparison`, () => {
    compareDrawing(
      (context) => {
        context.strokeStyle = "#1864ab"
        context.fillStyle = "#f59f0080"
        context.lineWidth = 5
        context.beginPath()
        if (shape === "arc") context.arc(64, 64, 40, 0.3, 5.4)
        if (shape === "ellipse")
          context.ellipse(64, 64, 48, 22, 0.6, 0, 2 * Math.PI)
        if (shape === "arcTo") {
          context.moveTo(16, 105)
          context.arcTo(64, 10, 112, 105, 24)
          context.lineTo(112, 105)
        }
        context.fill()
        context.stroke()
      },
      { name: `individual-${shape}` },
    )
  })
}

test("offscreen pattern layer compared to native canvas", () => {
  compareDrawing(
    (context) => {
      // Each renderer constructs and composites its own offscreen surface.
      const Canvas = context.canvas
        .constructor as typeof import("../src").MiniCanvas
      const layer = new Canvas(128, 128)
      const layerContext = layer.getContext("2d")
      layerContext.fillStyle = "#1864abc0"
      layerContext.fillRect(24, 24, 80, 80)
      layerContext.globalCompositeOperation = "destination-out"
      layerContext.beginPath()
      layerContext.arc(64, 64, 20, 0, 2 * Math.PI)
      layerContext.fill()
      context.fillStyle = "#f59f00"
      context.fillRect(10, 10, 108, 108)
      context.fillStyle = context.createPattern(layer, "no-repeat")!
      context.fillRect(0, 0, 128, 128)
    },
    { name: "offscreen-pattern-compositing" },
  )
})
