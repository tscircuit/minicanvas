/** Portable RGBA PNG encoder. Stored DEFLATE blocks avoid native codecs/WASM. */
const u32 = (n: number) =>
  new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i
  for (let j = 0; j < 8; j++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0)
  return n >>> 0
})
function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([new TextEncoder().encode(type), data])
  let crc = 0xffffffff
  for (const byte of body) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return concat([u32(data.length), body, u32((crc ^ 0xffffffff) >>> 0)])
}
export function encodePng({
  width,
  height,
  data,
}: {
  width: number
  height: number
  data: Uint8ClampedArray
}): Uint8Array {
  const rows = new Uint8Array(height * (width * 4 + 1))
  for (let y = 0; y < height; y++)
    rows.set(
      data.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    )
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])]
  let a = 1,
    b = 0
  for (const byte of rows) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  for (let offset = 0; offset < rows.length; offset += 65535) {
    const n = Math.min(65535, rows.length - offset)
    blocks.push(
      new Uint8Array([
        offset + n === rows.length ? 1 : 0,
        n & 255,
        n >>> 8,
        ~n & 255,
        (~n >>> 8) & 255,
      ]),
      rows.subarray(offset, offset + n),
    )
  }
  blocks.push(u32(((b << 16) | a) >>> 0))
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk(
      "IHDR",
      concat([u32(width), u32(height), new Uint8Array([8, 6, 0, 0, 0])]),
    ),
    chunk("IDAT", concat(blocks)),
    chunk("IEND", new Uint8Array()),
  ])
}
export function toBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += 3) {
    const n =
      (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    parts.push(
      alphabet[n >>> 18] +
        alphabet[(n >>> 12) & 63] +
        (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : "=") +
        (i + 2 < bytes.length ? alphabet[n & 63] : "="),
    )
  }
  return parts.join("")
}
