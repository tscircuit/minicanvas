import { test, expect } from "bun:test"
import { runInNewContext } from "node:vm"

test("browser bundle runs without Node, DOM, native addons or WASM", async () => {
  const result = await Bun.build({
    entrypoints: [new URL("../src/index.ts", import.meta.url).pathname],
    target: "browser",
    format: "esm",
  })
  expect(result.success).toBe(true)
  const source = await result.outputs[0].text()
  expect(source).not.toMatch(/require\(|from ["'](?:node:|@resvg|@napi-rs)/)
  // Turn only the generated export list into a return expression for the isolated VM.
  const executable = source.replace(
    /export\s*\{([\s\S]*?)\};?\s*$/,
    "return {$1};",
  )
  const output = runInNewContext(`(() => {${executable}})()`, { TextEncoder })
  const canvas = output.createCanvas({ width: 8, height: 8 })
  const context = canvas.getContext("2d")
  context.fillStyle = "#123456"
  context.fillRect(0, 0, 8, 8)
  expect([...context.getImageData(3, 3, 1, 1).data]).toEqual([18, 52, 86, 255])
  expect(canvas.toDataURL()).toStartWith("data:image/png;base64,iVBORw0KGgo")
})
