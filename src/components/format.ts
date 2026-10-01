import type { MrtLine, Route } from '../lib/types'

export const LINE_NAMES: Record<MrtLine, string> = {
  EW: 'East–West', NS: 'North–South', NE: 'North East', CC: 'Circle', DT: 'Downtown', TE: 'Thomson–East Coast', LRT: 'LRT',
}

export function clock(ms: number): string {
  return new Date(ms)
    .toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Singapore' })
    .replace(' ', '')
    .toLowerCase()
}

export function minsUntil(ms: number, now: number): number {
  return Math.max(0, Math.floor((ms - now) / 60_000))
}

export function ago(ms: number | undefined, now: number): string {
  if (!ms) return 'never'
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}

export function routeTitle(r: Route): string {
  if (r.kind === 'bus') return `Bus ${r.service}`
  if (r.kind === 'mrt') return `${r.line === 'LRT' ? 'LRT' : `${r.line} line`} from ${r.station}`
  return 'Taxi'
}

export function routeIcon(r: Route) {
  return r.kind === 'bus' ? 'bus' : r.kind === 'mrt' ? 'train' : 'taxi'
}

export const LOAD_LABEL: Record<string, string> = { SEA: 'Seats', SDA: 'Standing', LSD: 'Packed' }
