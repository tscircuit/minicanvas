export type Point = { x: number; y: number }
export type Matrix = [number, number, number, number, number, number]
export type Subpath = { points: Point[]; closed: boolean }
export const identity = (): Matrix => [1, 0, 0, 1, 0, 0]
export function transform(point: Point, m: Matrix): Point {
  return {
    x: m[0] * point.x + m[2] * point.y + m[4],
    y: m[1] * point.x + m[3] * point.y + m[5],
  }
}
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
}
export function inverse(m: Matrix): Matrix | null {
  const d = m[0] * m[3] - m[1] * m[2]
  return Math.abs(d) < 1e-15
    ? null
    : [
        m[3] / d,
        -m[1] / d,
        -m[2] / d,
        m[0] / d,
        (m[2] * m[5] - m[3] * m[4]) / d,
        (m[1] * m[4] - m[0] * m[5]) / d,
      ]
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export function circle({
  center,
  radius,
  tolerance = 0.15,
}: {
  center: Point
  radius: number
  tolerance?: number
}): Point[] {
  const count = Math.max(
    12,
    Math.ceil(
      Math.PI /
        Math.acos(Math.max(-1, 1 - tolerance / Math.max(radius, tolerance))),
    ),
  )
  return Array.from({ length: count }, (_, i) => ({
    x: center.x + radius * Math.cos((i * 2 * Math.PI) / count),
    y: center.y + radius * Math.sin((i * 2 * Math.PI) / count),
  }))
}
/** All stroke polygons use the same winding, making intersections a union. */
export function positivePolygon(points: Point[]): Point[] {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area < 0 ? [...points].reverse() : points
}
