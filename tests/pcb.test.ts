import { featureBoard } from "./fixtures/feature-board"
import { test, expect } from "bun:test"
import { createCanvas as nativeCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { createCanvas } from "../src"
import { drawPcb, snapshotSheet, views, viewSize } from "./helpers/pcb"
import { pixelError } from "./helpers/compare"

for (const fixture of [
  "rp2040-motor-controller",
  "arduino-uno",
  "feature-board",
]) {
  test(`${fixture}: four views match native canvas and stored snapshot`, async () => {
    const elements: AnyCircuitElement[] =
      fixture === "feature-board"
        ? featureBoard
        : await Bun.file(
            new URL(`./fixtures/${fixture}.json`, import.meta.url),
          ).json()
    if (fixture !== "feature-board") {
      expect(
        elements.filter((e) => e.type === "pcb_trace").length,
      ).toBeGreaterThan(100)
      expect(
        elements.filter((e) => e.type === "pcb_via").length,
      ).toBeGreaterThan(100)
    }
    const canvases = []
    for (const view of views) {
      const canvas = createCanvas({
        width: viewSize,
        height: viewSize,
        antialias: 4,
      })
      // Compare against a supersampled Skia reference to reduce differences caused
      // by repeated per-operation edge coverage on dense, overlapping copper.
      const referenceLarge = nativeCanvas(viewSize * 4, viewSize * 4)
      const reference = nativeCanvas(viewSize, viewSize)
      drawPcb(canvas, { elements, view })
      drawPcb(referenceLarge, { elements, view })
      reference
        .getContext("2d")
        .drawImage(referenceLarge, 0, 0, viewSize, viewSize)
      const error = pixelError(
        canvas.toImageData().data,
        reference.getContext("2d").getImageData(0, 0, viewSize, viewSize).data,
      )
      console.log(
        `${fixture}/${view}: mean=${error.mean.toFixed(3)}, >64/channel=${(100 * error.largeDifferenceFraction).toFixed(2)}%`,
      )
      if (error.mean >= 3 || error.largeDifferenceFraction >= 0.015) {
        await Bun.write(
          new URL(`./snapshots/${fixture}-${view}.actual.png`, import.meta.url),
          canvas.toPng(),
        )
        await Bun.write(
          new URL(
            `./snapshots/${fixture}-${view}.reference.png`,
            import.meta.url,
          ),
          reference.toBuffer("image/png"),
        )
      }
      expect(error.mean).toBeLessThan(3)
      expect(error.largeDifferenceFraction).toBeLessThan(0.015)
      canvases.push(canvas)
    }
    const png = snapshotSheet({
      title: fixture,
      subtitle:
        "minicanvas | circuit-to-canvas | mask overview + copper/paste detail",
      canvases,
    })
    const path = new URL(`./snapshots/${fixture}.png`, import.meta.url)
    if (process.env.UPDATE_SNAPSHOTS === "1") await Bun.write(path, png)
    expect(await Bun.file(path).exists()).toBe(true)
    const difference = Buffer.compare(
      Buffer.from(png),
      Buffer.from(await Bun.file(path).arrayBuffer()),
    )
    if (difference !== 0)
      await Bun.write(
        new URL(`./snapshots/${fixture}.actual.png`, import.meta.url),
        png,
      )
    expect(difference).toBe(0)
  }, 60000)
}
