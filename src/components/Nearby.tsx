import type { Stop } from '../lib/busData'
import type { StopArrivals } from '../lib/types'
import { LOAD_LABEL, minsUntil } from './format'

export function NearbyBuses({ stops, arrivals, now, open, onToggle }: {
  stops: (Stop & { distM: number })[]
  arrivals: Record<string, StopArrivals | undefined>
  now: number
  open: boolean
  onToggle: (open: boolean) => void
}) {
  return (
    <details className="card nearby" open={open} onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary className="section-h">All buses nearby</summary>
      {open && !stops.length && <p className="muted">No bus stops within 400 m.</p>}
      {open && stops.map((s) => {
        const a = arrivals[s.code]
        const services = a ? Object.entries(a).sort(([x], [y]) => parseInt(x) - parseInt(y) || x.localeCompare(y)) : []
        return (
          <div key={s.code} className="stop">
            <h3 className="stop-h">
              {s.name} <span className="muted">· {s.road} · {Math.round(s.distM)} m</span>
            </h3>
            {!a ? <p className="muted">Loading…</p> : !services.length ? <p className="muted">No buses right now.</p> : (
              <ul className="arrivals">
                {services.map(([no, list]) => (
                  <li key={no}>
                    <span className="svc">{no}</span>
                    {list.length ? list.slice(0, 2).map((b, i) => (
                      <span key={i} className={i ? 'muted' : 'arr'} title={LOAD_LABEL[b.load]}>
                        {minsUntil(b.at, now) || 'Arr'}<span className={`dot load-${b.load}`} aria-label={LOAD_LABEL[b.load]} />
                      </span>
                    )) : <span className="muted">–</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </details>
  )
}
