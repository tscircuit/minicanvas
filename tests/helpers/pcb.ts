import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { lineAlphabet } from "@tscircuit/alphabet"
import {
  createCanvas,
  type MiniCanvas,
  type MiniCanvasContext,
} from "../../src"

export const viewSize = 400
export const views = ["top", "bottom", "top-detail", "bottom-detail"] as const
export type View = (typeof views)[number]

export function drawPcb(
  context: ConstructorParameters<typeof CircuitToCanvasDrawer>[0],
  options: { elements: AnyCircuitElement[]; view: View },
) {
  const { elements, view } = options
  const board = elements.find((e) => e.type === "pcb_board") as PcbBoard
  const detail = view.endsWith("detail")
  const width = board.width! * (detail ? 0.45 : 1.12)
  const height = board.height! * (detail ? 0.45 : 1.12)
  const bottom = view.startsWith("bottom")
  const drawer = new CircuitToCanvasDrawer(context)
  drawer.setCameraBounds({
    minX: board.center.x - width / 2,
    maxX: board.center.x + width / 2,
    minY: board.center.y - height / 2,
    maxY: board.center.y + height / 2,
  })
  drawer.drawElements(elements, {
    layers: bottom
      ? ["bottom_copper", "bottom_silkscreen"]
      : ["top_copper", "top_silkscreen"],
    drawBoardMaterial: true,
    drawSoldermask: !detail,
    drawSoldermaskTop: !bottom,
    drawSoldermaskBottom: bottom,
    drawSolderPaste: detail,
    drawSolderPasteTop: !bottom,
    drawSolderPasteBottom: bottom,
    clearDrillHoles: true,
  })
}

export function drawLabel(
  context: MiniCanvasContext,
  options: { text: string; x: number; y: number; size?: number },
) {
  const { text, x, y, size = 14 } = options
  context.save()
  context.translate(x, y)
  context.scale(size, -size)
  context.strokeStyle = "#26364a"
  context.lineWidth = 0.06
  context.lineCap = "round"
  for (const char of text) {
    context.beginPath()
    for (const segment of lineAlphabet[char] ?? []) {
      context.moveTo(segment.x1, segment.y1)
      context.lineTo(segment.x2, segment.y2)
    }
    context.stroke()
    context.translate(0.72, 0)
  }
  context.restore()
}

/** Four views of one PCB, including two copper/paste detail views. */
export function snapshotSheet(options: {
  title: string
  subtitle: string
  canvases: MiniCanvas[]
}) {
  const sheet = createCanvas({ width: 824, height: 960 })
  const c = sheet.getContext("2d")
  c.fillStyle = "#edf1f5"
  c.fillRect(0, 0, 824, 932)
  c.fillStyle = "white"
  c.fillRect(12, 12, 800, 80)
  drawLabel(c, { text: options.title, x: 24, y: 42, size: 20 })
  drawLabel(c, { text: options.subtitle, x: 24, y: 70, size: 10 })
  for (let i = 0; i < 4; i++) {
    const x = 12 + (i % 2) * 412,
      y = 124 + Math.floor(i / 2) * 432
    drawLabel(c, {
      text: views[i].toUpperCase().replace("-", " / "),
      x,
      y: y - 8,
      size: 12,
    })
    const pattern = c.createPattern(options.canvases[i], "no-repeat")
    pattern.setTransform({ e: x, f: y })
    c.fillStyle = pattern
    c.fillRect(x, y, 400, 400)
  }
  return sheet.toPng()
}
