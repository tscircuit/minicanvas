import {
  circle,
  distance,
  positivePolygon,
  type Point,
  type Subpath,
} from "./geometry"
export type StrokeStyle = {
  width: number
  cap: "butt" | "round" | "square"
  join: "miter" | "round" | "bevel"
  miterLimit: number
  dash: number[]
  offset: number
  tolerance: number
}
function dashed(path: Subpath, style: StrokeStyle): Subpath[] {
  if (!style.dash.length) return [path]
  const points = path.closed ? [...path.points, path.points[0]] : path.points
  const total = style.dash.reduce((a, b) => a + b, 0)
  if (total === 0) return [path]
  let offset = ((style.offset % total) + total) % total,
    index = 0
  while (offset >= style.dash[index]) {
    offset -= style.dash[index]
    index = (index + 1) % style.dash.length
  }
  let remaining = style.dash[index] - offset,
    current: Point[] = []
  const result: Subpath[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = distance(a, b)
    let position = 0
    while (position < length - 1e-10) {
      if (remaining < 1e-10) {
        if (current.length) {
          result.push({ points: current, closed: false })
          current = []
        }
        index = (index + 1) % style.dash.length
        remaining = style.dash[index]
        continue
      }
      const amount = Math.min(remaining, length - position)
      if (index % 2 === 0) {
        if (!current.length)
          current.push({
            x: a.x + ((b.x - a.x) * position) / length,
            y: a.y + ((b.y - a.y) * position) / length,
          })
        current.push({
          x: a.x + ((b.x - a.x) * (position + amount)) / length,
          y: a.y + ((b.y - a.y) * (position + amount)) / length,
        })
      }
      position += amount
      remaining -= amount
    }
  }
  if (current.length) result.push({ points: current, closed: false })
  if (
    path.closed &&
    result.length > 1 &&
    distance(result[0].points[0], result.at(-1)!.points.at(-1)!) < 1e-8
  ) {
    const last = result.pop()!
    result[0].points = [...last.points, ...result[0].points.slice(1)]
  }
  return result
}
export function strokePolygons(
  paths: Subpath[],
  style: StrokeStyle,
): Point[][] {
  const polygons: Point[][] = [],
    r = style.width / 2
  for (const original of paths)
    for (const path of dashed(original, style)) {
      const p = path.points.filter(
        (point, i) => i === 0 || distance(point, path.points[i - 1]) > 1e-10,
      )
      if (path.closed && p.length > 1 && distance(p[0], p.at(-1)!) < 1e-10)
        p.pop()
      if (p.length < 2) {
        if (p.length && path.points.length > 1 && style.cap === "round")
          polygons.push(
            circle({ center: p[0], radius: r, tolerance: style.tolerance }),
          )
        continue
      }
      const count = path.closed ? p.length : p.length - 1
      for (let i = 0; i < count; i++) {
        let a = p[i],
          b = p[(i + 1) % p.length]
        const length = distance(a, b),
          dx = (b.x - a.x) / length,
          dy = (b.y - a.y) / length
        if (!path.closed && style.cap === "square") {
          if (i === 0) a = { x: a.x - dx * r, y: a.y - dy * r }
          if (i === count - 1) b = { x: b.x + dx * r, y: b.y + dy * r }
        }
        polygons.push(
          positivePolygon([
            { x: a.x - dy * r, y: a.y + dx * r },
            { x: b.x - dy * r, y: b.y + dx * r },
            { x: b.x + dy * r, y: b.y - dx * r },
            { x: a.x + dy * r, y: a.y - dx * r },
          ]),
        )
      }
      for (
        let i = path.closed ? 0 : 1;
        i < (path.closed ? p.length : p.length - 1);
        i++
      ) {
        const center = p[i],
          prev = p[(i + p.length - 1) % p.length],
          next = p[(i + 1) % p.length]
        if (style.join === "round") {
          polygons.push(
            circle({ center, radius: r, tolerance: style.tolerance }),
          )
          continue
        }
        const l0 = distance(prev, center),
          l1 = distance(center, next),
          u = { x: (center.x - prev.x) / l0, y: (center.y - prev.y) / l0 },
          v = { x: (next.x - center.x) / l1, y: (next.y - center.y) / l1 }
        const cross = u.x * v.y - u.y * v.x
        if (Math.abs(cross) < 1e-10) continue
        const side = cross > 0 ? -1 : 1,
          q0 = { x: center.x - side * u.y * r, y: center.y + side * u.x * r },
          q1 = { x: center.x - side * v.y * r, y: center.y + side * v.x * r }
        const t = ((q1.x - q0.x) * v.y - (q1.y - q0.y) * v.x) / cross,
          miter = { x: q0.x + t * u.x, y: q0.y + t * u.y }
        polygons.push(
          positivePolygon(
            style.join === "miter" &&
              distance(center, miter) <= style.miterLimit * r
              ? [center, q0, miter, q1]
              : [center, q0, q1],
          ),
        )
      }
      if (!path.closed && style.cap === "round")
        for (const center of [p[0], p.at(-1)!])
          polygons.push(
            circle({ center, radius: r, tolerance: style.tolerance }),
          )
    }
  return polygons
}
