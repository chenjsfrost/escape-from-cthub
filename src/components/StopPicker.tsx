import { useMemo, useState } from 'react'
import { searchStops, type BusData, type Stop } from '../lib/busData'
import { distanceM } from '../lib/geo'
import type { LatLng } from '../lib/types'
import { Icon } from './Icon'

/** Pick a stop from a suggested list, with search across `pool` (or all stops). */
export function StopPicker({ bus, origin, suggested, pool, onPick, label, placeholder = 'Search stop name, road or code' }: {
  bus: BusData
  origin?: LatLng
  suggested: Stop[]
  pool?: string[]
  onPick: (s: Stop) => void
  label: string
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    if (!q.trim()) return suggested
    return searchStops(bus, q, 30, pool)
  }, [q, bus, pool, suggested])

  return (
    <div className="picker">
      <label className="field">
        <span className="field-label">{label}</span>
        <span className="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
        </span>
      </label>
      <ul className="options" role="listbox" aria-label={label}>
        {results.map((s) => (
          <li key={s.code}>
            <button type="button" className="option" onClick={() => onPick(s)}>
              <span>
                <span className="option-title">{s.name}</span>
                <span className="muted"> · {s.road} · {s.code}</span>
              </span>
              {origin && <span className="muted">{Math.round(distanceM(origin, s))} m</span>}
            </button>
          </li>
        ))}
        {!results.length && <li className="muted">No stops match "{q}".</li>}
      </ul>
    </div>
  )
}
