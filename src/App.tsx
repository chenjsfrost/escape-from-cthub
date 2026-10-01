import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchArrivals, fetchWeather } from './lib/api'
import { loadBusData, stopsNear, type BusData } from './lib/busData'
import { deriveConditions } from './lib/conditions'
import { useGeolocation, useNow, usePolled } from './lib/hooks'
import { plan, tipsFor } from './lib/plan'
import { useAppState } from './lib/store'
import type { AppState, StopArrivals } from './lib/types'
import { ConditionsStrip } from './components/Conditions'
import { ago } from './components/format'
import { Icon, Logo } from './components/Icon'
import { Manage } from './components/Manage'
import { NearbyBuses } from './components/Nearby'
import { Onboarding } from './components/Onboarding'
import { OtherWays } from './components/OtherWays'
import { Verdict } from './components/Verdict'

function useBusData() {
  const [bus, setBus] = useState<BusData>()
  useEffect(() => {
    loadBusData().then(setBus, () => setTimeout(() => loadBusData().then(setBus, () => {}), 5000))
  }, [])
  return bus
}

export default function App() {
  const [state, setState] = useAppState()
  const bus = useBusData()
  if (!state) return <Onboarding bus={bus} onDone={setState} />
  return <Home state={state} setState={setState} bus={bus} />
}

function Home({ state, setState, bus }: { state: AppState; setState: (s: AppState | undefined) => void; bus?: BusData }) {
  const now = useNow(1000)
  const [manageOpen, setManageOpen] = useState(false)
  const [nearbyOpen, setNearbyOpen] = useState(false)

  const useGps = state.from === 'gps'
  const geo = useGeolocation(useGps)
  const place = state.places.find((p) => p.id === state.from) ?? state.places[0]
  const origin = (useGps && geo.pos) || place

  const nearby = useMemo(() => (bus && nearbyOpen ? stopsNear(bus, origin, 400, 4) : []), [bus, origin, nearbyOpen])
  const stopCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const r of state.routes) if (r.kind === 'bus') codes.add(r.boardStop)
    for (const s of nearby) codes.add(s.code)
    return [...codes].sort()
  }, [state.routes, nearby])

  const arrivals = usePolled<Record<string, StopArrivals>>(
    stopCodes.length ? `arr:${stopCodes.join(',')}` : undefined,
    async () => {
      const results = await Promise.allSettled(stopCodes.map(fetchArrivals))
      if (results.every((r) => r.status === 'rejected')) throw new Error('Bus arrivals unavailable')
      return Object.fromEntries(results.flatMap((r, i) => (r.status === 'fulfilled' ? [[stopCodes[i], r.value]] : [])))
    },
    30_000,
  )
  const weather = usePolled('weather', fetchWeather, 5 * 60_000)
  const conditions = useMemo(() => (weather.data ? deriveConditions(weather.data, origin) : undefined), [weather.data, origin])

  // Arrivals older than 3 minutes are too stale to trust for a "leave now" call.
  const freshArrivals = arrivals.at && now - arrivals.at < 3 * 60_000 ? arrivals.data ?? {} : {}
  const p = plan({ now, routes: state.routes, origin, bus, arrivals: freshArrivals, conditions })
  // A pinned route that was since deleted falls back to "fastest".
  const primary = state.routes.some((r) => r.id === state.primary) ? state.primary : undefined
  const shown = (primary && p.options.find((o) => o.route.id === primary)) || p.best
  const inSavedOrder = state.routes.flatMap((r) => p.options.filter((o) => o.route.id === r.id))
  const verdictRef = useRef<HTMLDivElement>(null)
  const select = (id?: string) => setState({ ...state, primary: id })
  const selectFromList = (id: string) => {
    select(id)
    // On a phone the card is above the list; bring it back into view.
    const el = verdictRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const lastUpdate = arrivals.at ?? weather.at

  return (
    <div className="app">
      <header className="top">
        <Logo size={36} />
        <label className="from">
          <span className="from-label">Escape from</span>
          <span className="from-select">
            <select value={state.from} onChange={(e) => setState({ ...state, from: e.target.value })} aria-label="Escaping from">
              {state.places.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
              <option value="gps">My location</option>
            </select>
            <Icon name="chevron" size={18} className="from-chev" />
          </span>
        </label>
        <button className="icon-btn" onClick={() => setManageOpen(true)} aria-label="Manage routes and places"><Icon name="settings" /></button>
      </header>
      {useGps && geo.error && <p className="banner" role="status">{geo.error} Using {place.name} instead.</p>}
      {!!arrivals.error && (
        <p className="banner" role="status">
          {arrivals.data ? `Can't reach live buses. Showing what we saw ${ago(arrivals.at, now)}.` : "Can't reach live buses right now. Retrying…"}
        </p>
      )}

      <main className="stack-lg">
        <ConditionsStrip c={conditions} unavailable={!!weather.error && !weather.data} />
        <div ref={verdictRef} className="verdict-slot">
          <Verdict shown={shown} best={p.best} options={inSavedOrder} primary={primary} onSelect={select}
            now={now} tips={tipsFor(conditions, shown)} loading={arrivals.loading && !arrivals.data} />
        </div>
        <OtherWays options={p.options} best={p.best} shownId={shown?.route.id} onSelect={selectFromList} />
        <NearbyBuses stops={nearby} arrivals={arrivals.data ?? {}} now={now} open={nearbyOpen} onToggle={setNearbyOpen} />
      </main>

      <footer className="foot">
        <button className="link" onClick={() => { arrivals.refresh(); weather.refresh() }}>
          Updated {ago(lastUpdate, now)} · Refresh
        </button>
        <p className="fineprint">Live data from arrivelah, BusRouter and data.gov.sg. Times are estimates, so give yourself a minute.</p>
      </footer>

      <Manage open={manageOpen} onClose={() => setManageOpen(false)} state={state} setState={setState} bus={bus} origin={origin} />
    </div>
  )
}
