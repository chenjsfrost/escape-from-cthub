import { distanceM, nearest } from './geo'
import type { Weather } from './api'
import type { Conditions, LatLng, RainLevel } from './types'

/** 5-minute rainfall total at or above this is heavy (~12 mm/h). */
const HEAVY_MM_PER_5MIN = 1

const WET = /shower|rain|thunder/i

export function deriveConditions(w: Weather, at: LatLng): Conditions {
  const rainStation = nearest(at, w.rainfall.stations.filter((s) => s.id in w.rainfall.mm), (s) => s)
  const rainNowMm = rainStation ? w.rainfall.mm[rainStation.id] : undefined
  const rainNow: RainLevel = !rainNowMm ? 'none' : rainNowMm >= HEAVY_MM_PER_5MIN ? 'heavy' : 'light'

  const area = nearest(at, w.forecast.areas, (a) => a)
  const forecast = area ? w.forecast.forecasts[area.name] : undefined

  const tempStation = nearest(at, w.temperature.stations.filter((s) => s.id in w.temperature.c), (s) => s)
  // PSI regions are keyed north/south/east/west/central; pick the closest label.
  const region = nearest(at, w.air.regions, (r) => r)

  return {
    rainKnown: rainNowMm !== undefined || forecast !== undefined,
    rainNow,
    rainNowMm,
    forecast,
    forecastArea: area?.name,
    forecastUntil: w.forecast.until,
    rainSoon: !!forecast && WET.test(forecast),
    thundery: !!forecast && /thunder/i.test(forecast),
    tempC: tempStation ? w.temperature.c[tempStation.id] : undefined,
    uv: w.uv,
    psi: region ? w.air.psi[region.name] : undefined,
    pm25: region ? w.air.pm25[region.name] : undefined,
    region: region?.name,
    taxisNearby: w.taxis.length ? w.taxis.filter(([lng, lat]) => distanceM(at, { lat, lng }) <= 500).length : undefined,
  }
}

export const isHazy = (c: Conditions) => (c.psi ?? 0) > 100 || (c.pm25 ?? 0) > 55
export const isHot = (c: Conditions) => (c.tempC ?? 0) >= 33 || (c.uv ?? 0) >= 8
