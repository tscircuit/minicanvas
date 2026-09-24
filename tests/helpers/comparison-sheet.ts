import { mkdirSync, writeFileSync } from "node:fs"
import { createCanvas, ImageData } from "@napi-rs/canvas"

/** The same case on light/checkered and dark backgrounds exposes alpha errors. */
export function writeComparisonSheet(options: {
  size?: number
  name: string
  actual: Uint8ClampedArray
  expected: Uint8ClampedArray
  meanError: number
  largeDifferenceFraction: number
}) {
  const size = options.size ?? 128
  const panelSize = Math.max(256, size)
  const sheet = createCanvas(panelSize * 2 + 56, panelSize * 2 + 146)
  const context = sheet.getContext("2d")
  context.fillStyle = "#edf1f5"
  context.fillRect(0, 0, sheet.width, sheet.height)
  context.fillStyle = "#17253a"
  context.font = "bold 16px sans-serif"
  context.fillText(options.name, 16, 26)
  context.font = "12px sans-serif"
  context.fillText(
    `Mean RGBA error: ${options.meanError.toFixed(3)}/255 | large differences: ${(100 * options.largeDifferenceFraction).toFixed(2)}%`,
    16,
    48,
  )
  context.fillText("minicanvas", 16, 74)
  context.fillText("@napi-rs/canvas (Skia)", panelSize + 40, 74)
  for (const [column, data] of [options.actual, options.expected].entries()) {
    const source = createCanvas(size, size)
    source.getContext("2d").putImageData(new ImageData(data, size, size), 0, 0)
    for (let row = 0; row < 2; row++) {
      const x = 16 + column * (panelSize + 24)
      const y = 86 + row * (panelSize + 26)
      for (let dy = 0; dy < panelSize; dy += 16) {
        for (let dx = 0; dx < panelSize; dx += 16) {
          context.fillStyle =
            row === 1 ? "#17253a" : ((dx + dy) / 16) % 2 ? "#d7dde5" : "white"
          context.fillRect(x + dx, y + dy, 16, 16)
        }
      }
      context.imageSmoothingEnabled = false
      context.drawImage(source, x, y, panelSize, panelSize)
    }
  }
  context.fillStyle = "#17253a"
  context.fillText(
    `Same drawing commands | ${panelSize / size}x pixel zoom | checkerboard / dark`,
    16,
    sheet.height - 14,
  )
  const directory = new URL("../output/comparisons/", import.meta.url)
  mkdirSync(directory, { recursive: true })
  const png = sheet.toBuffer("image/png")
  writeFileSync(new URL(`${options.name}.png`, directory), png)
  if (process.env.UPDATE_SNAPSHOTS === "1") {
    const snapshots = new URL("../snapshots/comparisons/", import.meta.url)
    mkdirSync(snapshots, { recursive: true })
    writeFileSync(new URL(`${options.name}.png`, snapshots), png)
  }
}
