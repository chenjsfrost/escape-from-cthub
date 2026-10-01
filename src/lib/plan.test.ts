import { describe, expect, it } from 'vitest'
import { indexBusData, estimateRideMin, stopsAfter } from './busData'
import { plan, mrtWaitMin, taxiPickupMin, tipsFor } from './plan'
import type { BusRoute, Conditions, MrtRoute, TaxiRoute } from './types'

const MIN = 60_000
// Thursday 1 Oct 2026, 6:00pm Singapore time (evening peak).
const NOW = Date.parse('2026-10-01T18:00:00+08:00')

// Three stops ~1 km apart along a line of longitude.
const bus = indexBusData(
  {
    A: [103.86, 1.31, 'Office Stop', 'Lavender St'],
    B: [103.86, 1.319, 'Middle', 'Road'],
    C: [103.86, 1.328, 'Home Stop', 'Road'],
  },
  { '145': { name: 'X ⇄ Y', routes: [['A', 'B', 'C'], ['C', 'B', 'A']] } },
)
const origin = { lat: 1.3105, lng: 103.86 } // ~55 m from stop A -> 1 min walk

const busRoute: BusRoute = { id: 'b', kind: 'bus', name: 'Home', service: '145', boardStop: 'A', alightStop: 'C', walkFromMin: 5 }
const mrt: MrtRoute = { id: 'm', kind: 'mrt', name: 'Home', station: 'Lavender', line: 'EW', walkToMin: 7, rideMin: 20, walkFromMin: 5 }
const taxi: TaxiRoute = { id: 't', kind: 'taxi', name: 'Home', rideMin: 15 }
const dry: Conditions = { rainKnown: true, rainNow: 'none', rainSoon: false, thundery: false, taxisNearby: 12 }

describe('bus data', () => {
  it('indexes services by stop and lists downstream stops', () => {
    expect(bus.servicesAt.A).toEqual(['145'])
    expect(stopsAfter(bus, '145', 'B')).toEqual(['C', 'A'])
  })
  it('estimates ride time from stop distances', () => {
    // ~2 km at ~19 km/h
    expect(estimateRideMin(bus, '145', 'A', 'C')).toBe(6)
    expect(estimateRideMin(bus, '145', 'C', 'A')).toBe(6)
    expect(estimateRideMin(bus, '145', 'A', 'Z')).toBeUndefined()
  })
})

describe('plan', () => {
  it('tells you when to leave to catch the next catchable bus', () => {
    const p = plan({ now: NOW, routes: [busRoute], origin, bus, arrivals: { A: { '145': [{ at: NOW + 6 * MIN, load: 'SEA' }] } }, conditions: dry })
    expect(p.best?.leaveInMin).toBe(4) // 6 min away, 1 min walk, 1 min buffer
    expect(p.best?.homeBy).toBe(NOW + (6 + 6 + 5) * MIN)
    expect(p.best?.rideEstimated).toBe(true)
  })

  it('skips a bus you cannot reach in time', () => {
    const p = plan({
      now: NOW, routes: [{ ...busRoute, rideMin: 30 }], origin, bus,
      arrivals: { A: { '145': [{ at: NOW + 0.2 * MIN, load: 'SEA' }, { at: NOW + 9 * MIN, load: 'SEA' }] } },
    })
    expect(p.best?.bus?.at).toBe(NOW + 9 * MIN)
    expect(p.best?.rideMin).toBe(30)
    expect(p.best?.rideEstimated).toBe(false)
  })

  it('ranks the soonest home first in fine weather', () => {
    const p = plan({ now: NOW, routes: [mrt, busRoute, taxi], origin, bus, arrivals: { A: { '145': [{ at: NOW + 20 * MIN, load: 'SEA' }] } }, conditions: dry })
    expect(p.best?.route.kind).toBe('taxi') // 3 + 15 = 18 min
    expect(p.options.map((o) => o.route.kind)).toEqual(['taxi', 'bus', 'mrt']) // 31 vs 34 min
  })

  it('pushes walking-heavy options down when it pours', () => {
    const arrivals = { A: { '145': [{ at: NOW + 3 * MIN, load: 'SEA' }] } }
    const fine = plan({ now: NOW, routes: [busRoute, { ...taxi, rideMin: 12 }], origin, bus, arrivals, conditions: { ...dry, taxisNearby: 0 } })
    expect(fine.best?.route.kind).toBe('bus') // 14 min vs 24 min; in heavy rain the 6 min walk costs +12
    const wet = plan({ now: NOW, routes: [busRoute, { ...taxi, rideMin: 12 }], origin, bus, arrivals, conditions: { ...dry, taxisNearby: 0, rainNow: 'heavy' } })
    expect(wet.best?.route.kind).toBe('taxi')
    expect(tipsFor({ ...dry, rainNow: 'heavy' }, wet.best)[0].text).toMatch(/taxi wins/)
  })

  it('keeps routes without live data out of the verdict', () => {
    const p = plan({ now: NOW, routes: [busRoute], origin, bus, arrivals: { A: { '145': [] } } })
    expect(p.best).toBeUndefined()
    expect(p.options[0].status).toBe('no-bus')
    const loading = plan({ now: NOW, routes: [busRoute], origin, bus, arrivals: {} })
    expect(loading.options[0].status).toBe('loading')
  })

  it('says the coast is clear when nothing is wrong', () => {
    expect(tipsFor(dry, undefined)).toEqual([expect.objectContaining({ kind: 'clear' })])
  })

  it('does not claim clear skies without rain data', () => {
    expect(tipsFor({ ...dry, rainKnown: false }, undefined)).toEqual([])
  })
})

describe('estimates', () => {
  it('uses shorter MRT waits at peak', () => {
    expect(mrtWaitMin(NOW)).toBe(2)
    expect(mrtWaitMin(Date.parse('2026-10-01T14:00:00+08:00'))).toBe(3)
    expect(mrtWaitMin(Date.parse('2026-10-01T23:30:00+08:00'))).toBe(5)
    expect(mrtWaitMin(Date.parse('2026-10-03T18:00:00+08:00'))).toBe(3) // Saturday
  })
  it('scales taxi pickup with taxis nearby', () => {
    expect(taxiPickupMin(15)).toBe(3)
    expect(taxiPickupMin(0)).toBe(12)
  })
})
