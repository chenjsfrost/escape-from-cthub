import { distanceM } from './geo'
import type { LatLng } from './types'

export type Stop = LatLng & { code: string; name: string; road: string }

export type BusData = {
  stops: Record<string, Stop>
  /** service -> directions -> ordered stop codes */
  services: Record<string, { name: string; routes: string[][] }>
  /** stop code -> services calling there */
  servicesAt: Record<string, string[]>
}

const BASE = 'https://data.busrouter.sg/v1'
let pending: Promise<BusData> | undefined

export function loadBusData(): Promise<BusData> {
  pending ??= Promise.all([
    fetch(`${BASE}/stops.min.json`).then((r) => r.json()),
    fetch(`${BASE}/services.min.json`).then((r) => r.json()),
  ])
    .then(([rawStops, services]) => indexBusData(rawStops, services))
    .catch((e) => {
      pending = undefined
      throw e
    })
  return pending
}

export function indexBusData(
  rawStops: Record<string, [number, number, string, string]>,
  services: BusData['services'],
): BusData {
  const stops: Record<string, Stop> = {}
  for (const [code, [lng, lat, name, road]] of Object.entries(rawStops)) {
    stops[code] = { code, lat, lng, name, road }
  }
  const servicesAt: Record<string, string[]> = {}
  for (const [no, svc] of Object.entries(services)) {
    for (const code of new Set(svc.routes.flat())) {
      ;(servicesAt[code] ??= []).push(no)
    }
  }
  for (const list of Object.values(servicesAt)) list.sort(compareService)
  return { stops, services, servicesAt }
}

export function compareService(a: string, b: string): number {
  return parseInt(a) - parseInt(b) || a.localeCompare(b)
}

export function stopsNear(data: BusData, from: LatLng, radiusM: number, limit = 8): (Stop & { distM: number })[] {
  return Object.values(data.stops)
    .map((s) => ({ ...s, distM: distanceM(from, s) }))
    .filter((s) => s.distM <= radiusM)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, limit)
}

export function matchRank(s: Stop, needle: string): number {
  const name = s.name.toLowerCase()
  if (s.code === needle || name.startsWith(needle)) return 0
  if (name.includes(needle)) return 1
  if (s.code.startsWith(needle) || s.road.toLowerCase().includes(needle)) return 2
  return -1
}

export function searchStops(data: BusData, q: string, limit = 20, pool?: string[]): Stop[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  const stops = pool ? pool.map((c) => data.stops[c]).filter(Boolean) : Object.values(data.stops)
  return stops
    .map((s) => ({ s, r: matchRank(s, needle) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r) // stable: keeps route order within a rank
    .slice(0, limit)
    .map((x) => x.s)
}

/** Stops reachable after boarding `service` at `board`, in travel order. */
export function stopsAfter(data: BusData, service: string, board: string): string[] {
  const out: string[] = []
  for (const dir of data.services[service]?.routes ?? []) {
    const i = dir.indexOf(board)
    if (i >= 0) for (const c of dir.slice(i + 1)) if (!out.includes(c)) out.push(c)
  }
  return out
}

/**
 * Estimated ride minutes, from the summed distance between consecutive stops
 * at ~19 km/h (a typical Singapore bus average including dwell time).
 */
export function estimateRideMin(data: BusData, service: string, board: string, alight: string): number | undefined {
  for (const dir of data.services[service]?.routes ?? []) {
    const i = dir.indexOf(board)
    const j = dir.indexOf(alight, i + 1)
    if (i < 0 || j < 0) continue
    let m = 0
    for (let k = i; k < j; k++) {
      const a = data.stops[dir[k]]
      const b = data.stops[dir[k + 1]]
      if (a && b) m += distanceM(a, b)
    }
    return Math.max(2, Math.round((m / 1000) * 3.2))
  }
  return undefined
}
