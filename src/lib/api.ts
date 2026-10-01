import type { Arrival, LatLng, StopArrivals } from './types'

const GOV = 'https://api-open.data.gov.sg/v2/real-time/api'

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

type ArriveLahBus = { time: string; load: string } | null | undefined
type ArriveLah = { services: { no: string; next?: ArriveLahBus; subsequent?: ArriveLahBus; next2?: ArriveLahBus; next3?: ArriveLahBus }[] }

export async function fetchArrivals(stop: string): Promise<StopArrivals> {
  const data = await json<ArriveLah>(`https://arrivelah2.busrouter.sg/?id=${encodeURIComponent(stop)}`)
  const out: StopArrivals = {}
  for (const s of data.services) {
    // arrivelah repeats "subsequent" as "next2", so de-duplicate by time.
    const seen = new Set<number>()
    const list: Arrival[] = []
    for (const b of [s.next, s.subsequent, s.next2, s.next3]) {
      if (!b?.time) continue
      const at = Date.parse(b.time)
      if (Number.isNaN(at) || seen.has(at)) continue
      seen.add(at)
      list.push({ at, load: b.load })
    }
    out[s.no] = list.sort((a, b) => a.at - b.at)
  }
  return out
}

/** Raw readings from data.gov.sg, kept close to the source shape. */
export type Weather = {
  forecast: {
    areas: (LatLng & { name: string })[]
    forecasts: Record<string, string>
    until?: number
  }
  rainfall: { stations: (LatLng & { id: string })[]; mm: Record<string, number> }
  temperature: { stations: (LatLng & { id: string })[]; c: Record<string, number> }
  uv?: number
  air: { regions: (LatLng & { name: string })[]; psi: Record<string, number>; pm25: Record<string, number> }
  taxis: [number, number][]
}

type Station = { id: string; location: { latitude: number; longitude: number } }
type StationReadings = { data: { stations: Station[]; readings: { data: { stationId: string; value: number }[] }[] } }
type Region = { name: string; labelLocation: { latitude: number; longitude: number } }

function stations(list: Station[]) {
  return list.map((s) => ({ id: s.id, lat: s.location.latitude, lng: s.location.longitude }))
}
function readings(r: StationReadings): Record<string, number> {
  return Object.fromEntries((r.data.readings[0]?.data ?? []).map((d) => [d.stationId, d.value]))
}

/**
 * data.gov.sg allows only a handful of requests per burst without an API key,
 * so this makes five calls (PSI already carries PM2.5) and keeps whatever succeeds.
 */
export async function fetchWeather(): Promise<Weather> {
  const settled = await Promise.allSettled([
    json<any>(`${GOV}/two-hr-forecast`),
    json<StationReadings>(`${GOV}/rainfall`),
    json<StationReadings>(`${GOV}/air-temperature`),
    json<any>(`${GOV}/uv`),
    json<any>(`${GOV}/psi`),
    json<any>('https://api.data.gov.sg/v1/transport/taxi-availability'),
  ])
  if (settled.every((r) => r.status === 'rejected')) throw new Error('Weather unavailable')
  const [fc, rain, temp, uv, psi, taxi] = settled.map((r) => (r.status === 'fulfilled' ? r.value : undefined))
  const item = fc?.data?.items?.[0]
  const air = psi?.data?.items?.[0]?.readings
  return {
    forecast: {
      areas: (fc?.data?.area_metadata ?? []).map((a: any) => ({ name: a.name, lat: a.label_location.latitude, lng: a.label_location.longitude })),
      forecasts: Object.fromEntries((item?.forecasts ?? []).map((f: any) => [f.area, f.forecast])),
      until: item?.valid_period?.end ? Date.parse(item.valid_period.end) : undefined,
    },
    rainfall: rain ? { stations: stations(rain.data.stations), mm: readings(rain) } : { stations: [], mm: {} },
    temperature: temp ? { stations: stations(temp.data.stations), c: readings(temp) } : { stations: [], c: {} },
    uv: uv?.data?.records?.[0]?.index?.[0]?.value,
    air: {
      regions: (psi?.data?.regionMetadata ?? []).map((r: Region) => ({ name: r.name, lat: r.labelLocation.latitude, lng: r.labelLocation.longitude })),
      psi: air?.psi_twenty_four_hourly ?? {},
      pm25: air?.pm25_twenty_four_hourly ?? {},
    },
    taxis: taxi?.features?.[0]?.geometry?.coordinates ?? [],
  }
}
