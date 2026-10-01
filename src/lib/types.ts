export type LatLng = { lat: number; lng: number }

export type Place = LatLng & { id: string; name: string }

export type BusRoute = {
  id: string
  kind: 'bus'
  name: string
  service: string
  boardStop: string
  alightStop: string
  /** User override; otherwise estimated from stop distances. */
  rideMin?: number
  walkFromMin: number
}

export type MrtRoute = {
  id: string
  kind: 'mrt'
  name: string
  station: string
  line: MrtLine
  walkToMin: number
  rideMin: number
  walkFromMin: number
}

export type TaxiRoute = {
  id: string
  kind: 'taxi'
  name: string
  rideMin: number
}

export type Route = BusRoute | MrtRoute | TaxiRoute

export type MrtLine = 'EW' | 'NS' | 'NE' | 'CC' | 'DT' | 'TE' | 'LRT'

export type AppState = {
  version: 1
  places: Place[]
  /** 'gps' or a place id. */
  from: string
  routes: Route[]
}

/** Live bus arrival, as epoch ms. */
export type Arrival = { at: number; load: 'SEA' | 'SDA' | 'LSD' | string }

/** service number -> upcoming arrivals at a stop, soonest first. */
export type StopArrivals = Record<string, Arrival[]>

export type RainLevel = 'none' | 'light' | 'heavy'

export type Conditions = {
  /** False when neither rainfall nor forecast data came through. */
  rainKnown: boolean
  rainNow: RainLevel
  rainNowMm?: number
  forecast?: string
  forecastArea?: string
  forecastUntil?: number
  rainSoon: boolean
  thundery: boolean
  tempC?: number
  uv?: number
  psi?: number
  pm25?: number
  region?: string
  taxisNearby?: number
}
