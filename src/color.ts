export type Color = [number, number, number, number]
const named: Record<string, string> = {
  transparent: "#00000000",
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  orange: "#ffa500",
  purple: "#800080",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  lime: "#00ff00",
  navy: "#000080",
  teal: "#008080",
  maroon: "#800000",
  olive: "#808000",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  gold: "#ffd700",
}
const clamp = (n: number) => Math.max(0, Math.min(1, n))
export function parseColor(input: string): Color {
  let value = input.trim().toLowerCase()
  value = named[value] ?? value
  if (/^#[a-f\d]{3,4}$/.test(value))
    value = "#" + [...value.slice(1)].map((c) => c + c).join("")
  if (/^#[a-f\d]{6}([a-f\d]{2})?$/.test(value))
    return [
      parseInt(value.slice(1, 3), 16) / 255,
      parseInt(value.slice(3, 5), 16) / 255,
      parseInt(value.slice(5, 7), 16) / 255,
      value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1,
    ]
  const rgb = value.match(/^rgba?\(([^)]+)\)$/)
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3 || parts.length > 4)
      throw new Error(`Invalid color: ${input}`)
    const channels = parts.map((v, i) =>
      clamp(parseFloat(v) / (v.endsWith("%") ? 100 : i < 3 ? 255 : 1)),
    )
    if (channels.some((n) => !Number.isFinite(n)))
      throw new Error(`Invalid color: ${input}`)
    return [channels[0], channels[1], channels[2], channels[3] ?? 1]
  }
  throw new Error(
    `Unsupported CSS color: ${input}. Use hex, rgb(), rgba(), or a basic named color.`,
  )
}
