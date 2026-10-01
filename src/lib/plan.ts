import { estimateRideMin, type BusData } from './busData'
import { isHazy, isHot } from './conditions'
import { walkMin } from './geo'
import type { Arrival, Conditions, LatLng, Route, StopArrivals } from './types'

const MIN = 60_000

export type Option = {
  route: Route
  /** 'loading': arrivals not fetched yet. 'no-bus': service not running right now. */
  status: 'ok' | 'loading' | 'no-bus'
  leaveInMin: number
  homeBy: number
  walkToMin: number
  waitMin: number
  rideMin: number
  rideEstimated: boolean
  outdoorMin: number
  /** Bus is catchable only if you leave immediately and walk briskly. */
  hustle: boolean
  bus?: Arrival
  /** Ranking key: home time plus a penalty for time spent outdoors in bad weather. */
  score: number
}

export type Tip = { kind: 'rain' | 'thunder' | 'haze' | 'heat' | 'clear'; text: string; tone: 'warn' | 'info' | 'good' }

export type Plan = { best?: Option; others: Option[]; tips: Tip[] }

export type PlanInput = {
  now: number
  routes: Route[]
  origin?: LatLng
  bus?: BusData
  arrivals: Record<string, StopArrivals | undefined>
  conditions?: Conditions
}

/** Penalty minutes added per minute spent walking outdoors. */
export function exposurePenalty(c: Conditions | undefined): number {
  if (!c) return 0
  let p = 0
  if (c.rainNow === 'heavy') p += 2
  else if (c.rainNow === 'light') p += 1
  else if (c.rainSoon) p += 0.3
  if (c.thundery) p += 0.5
  if (isHazy(c)) p += 0.5
  if (isHot(c)) p += 0.3
  return p
}

/** Average platform wait: half the typical headway for the hour in Singapore. */
export function mrtWaitMin(now: number): number {
  const parts = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const weekend = /Sat|Sun/.test(parts.find((p) => p.type === 'weekday')?.value ?? '')
  if (hour >= 23 || hour < 6) return 5
  if (!weekend && ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20))) return 2
  return 3
}

export function taxiPickupMin(taxisNearby: number | undefined): number {
  if (taxisNearby === undefined) return 6
  if (taxisNearby >= 10) return 3
  if (taxisNearby >= 4) return 5
  if (taxisNearby >= 1) return 8
  return 12
}

function optionFor(route: Route, input: PlanInput, penalty: number): Option {
  const { now } = input
  const base = { route, hustle: false, rideEstimated: false }

  if (route.kind === 'taxi') {
    const waitMin = taxiPickupMin(input.conditions?.taxisNearby)
    const homeBy = now + (waitMin + route.rideMin) * MIN
    return { ...base, status: 'ok', leaveInMin: 0, homeBy, walkToMin: 0, waitMin, rideMin: route.rideMin, outdoorMin: 0, score: homeBy }
  }

  if (route.kind === 'mrt') {
    const waitMin = mrtWaitMin(now)
    const outdoorMin = route.walkToMin + route.walkFromMin
    const homeBy = now + (route.walkToMin + waitMin + route.rideMin + route.walkFromMin) * MIN
    return { ...base, status: 'ok', leaveInMin: 0, homeBy, walkToMin: route.walkToMin, waitMin, rideMin: route.rideMin, outdoorMin, score: homeBy + outdoorMin * penalty * MIN }
  }

  const stop = input.bus?.stops[route.boardStop]
  const walkToMin = stop && input.origin ? walkMin(input.origin, stop) : 3
  const estimate = input.bus ? estimateRideMin(input.bus, route.service, route.boardStop, route.alightStop) : undefined
  const rideMin = route.rideMin ?? estimate ?? 20
  const rideEstimated = route.rideMin === undefined
  const outdoorMin = walkToMin + route.walkFromMin
  const common = { ...base, walkToMin, rideMin, rideEstimated, outdoorMin }

  const stopArrivals = input.arrivals[route.boardStop]
  if (!stopArrivals) {
    const homeBy = now + (walkToMin + 8 + rideMin + route.walkFromMin) * MIN
    return { ...common, status: 'loading', leaveInMin: 0, waitMin: 0, homeBy, score: Infinity }
  }
  // Catchable if it arrives no sooner than the walk takes (with 30s grace for a brisk pace).
  const bus = (stopArrivals[route.service] ?? []).find((a) => (a.at - now) / MIN >= walkToMin - 0.5)
  if (!bus) {
    return { ...common, status: 'no-bus', leaveInMin: 0, waitMin: 0, homeBy: Infinity, score: Infinity }
  }
  const untilBus = (bus.at - now) / MIN
  // Aim to reach the stop a minute early.
  const leaveInMin = Math.max(0, Math.floor(untilBus - walkToMin - 1))
  const homeBy = bus.at + (rideMin + route.walkFromMin) * MIN
  return {
    ...common,
    status: 'ok',
    bus,
    leaveInMin,
    waitMin: Math.max(0, Math.round(untilBus - leaveInMin - walkToMin)),
    hustle: untilBus < walkToMin + 0.5,
    homeBy,
    score: homeBy + outdoorMin * penalty * MIN,
  }
}

export function tipsFor(c: Conditions | undefined, best: Option | undefined): Tip[] {
  if (!c) return []
  const tips: Tip[] = []
  const walking = (best?.outdoorMin ?? 0) > 0
  if (c.rainNow === 'heavy') {
    tips.push({ kind: 'rain', tone: 'warn', text: best?.route.kind === 'taxi' ? 'Pouring right now, so a taxi wins.' : 'Pouring right now. Wait about 15 min for it to ease, or grab a taxi.' })
  } else if (c.rainNow === 'light') {
    tips.push({ kind: 'rain', tone: 'warn', text: walking ? 'Light rain out there. Bring the brolly.' : 'Light rain out there.' })
  } else if (c.rainSoon) {
    tips.push({ kind: 'rain', tone: 'info', text: `${c.forecast} expected${c.forecastArea ? ` around ${c.forecastArea}` : ''}. Go now to beat it.` })
  }
  if (c.thundery) tips.push({ kind: 'thunder', tone: 'warn', text: 'Thundery weather. Avoid long open walks.' })
  if (isHazy(c)) tips.push({ kind: 'haze', tone: 'warn', text: `Air is unhealthy (PSI ${c.psi ?? '–'}). Keep the outdoor bit short.` })
  if (isHot(c) && c.rainNow === 'none') tips.push({ kind: 'heat', tone: 'info', text: `${c.tempC !== undefined ? `${Math.round(c.tempC)}° and ` : ''}${(c.uv ?? 0) >= 8 ? 'strong sun' : 'hot'}. Stick to the shade.` })
  if (!tips.length && c.rainKnown) tips.push({ kind: 'clear', tone: 'good', text: 'Coast is clear. Nothing to slow your escape.' })
  return tips
}

export function plan(input: PlanInput): Plan {
  const penalty = exposurePenalty(input.conditions)
  const options = input.routes.map((r) => optionFor(r, input, penalty))
  const rank = { ok: 0, loading: 1, 'no-bus': 2 }
  options.sort((a, b) => rank[a.status] - rank[b.status] || a.score - b.score)
  const best = options[0]?.status === 'ok' ? options[0] : undefined
  return { best, others: best ? options.slice(1) : options, tips: tipsFor(input.conditions, best) }
}
