import type { LatLng } from './types'

export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371e3
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Straight-line distance padded for real streets, at an unhurried 75 m/min. */
export function walkMin(a: LatLng, b: LatLng): number {
  return Math.max(1, Math.round((distanceM(a, b) * 1.3) / 75))
}

export function nearest<T>(from: LatLng, items: T[], at: (t: T) => LatLng): T | undefined {
  let best: T | undefined
  let bestD = Infinity
  for (const it of items) {
    const d = distanceM(from, at(it))
    if (d < bestD) {
      bestD = d
      best = it
    }
  }
  return best
}
