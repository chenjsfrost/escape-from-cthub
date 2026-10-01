import { useMemo, useState } from 'react'
import { estimateRideMin, stopsAfter, stopsNear, type BusData } from '../lib/busData'
import { uid } from '../lib/store'
import type { LatLng, MrtLine, Route } from '../lib/types'
import { LINE_NAMES } from './format'
import { Icon } from './Icon'
import { StopPicker } from './StopPicker'

type Kind = Route['kind']

function NumberField({ label, value, onChange, placeholder, hint }: { label: string; value: number | undefined; onChange: (n: number | undefined) => void; placeholder?: string; hint?: string }) {
  return (
    <label className="field field-num">
      <span className="field-label">{label}</span>
      <span className="num">
        <input type="number" inputMode="numeric" min={0} max={240} value={value ?? ''} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
        <span className="muted">min</span>
      </span>
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

export function RouteEditor({ bus, origin, initial, onSave, onCancel, saveLabel = 'Save route' }: {
  bus?: BusData
  origin: LatLng
  initial?: Route
  onSave: (r: Route) => void
  onCancel?: () => void
  saveLabel?: string
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'bus')
  const [name, setName] = useState(initial?.name ?? 'Home')
  // Bus
  const b = initial?.kind === 'bus' ? initial : undefined
  const [board, setBoard] = useState(b?.boardStop)
  const [service, setService] = useState(b?.service)
  const [alight, setAlight] = useState(b?.alightStop)
  const [busRide, setBusRide] = useState<number | undefined>(b?.rideMin)
  const [busWalkFrom, setBusWalkFrom] = useState<number | undefined>(b?.walkFromMin ?? 5)
  // MRT
  const m = initial?.kind === 'mrt' ? initial : undefined
  const [station, setStation] = useState(m?.station ?? '')
  const [line, setLine] = useState<MrtLine>(m?.line ?? 'EW')
  const [walkTo, setWalkTo] = useState<number | undefined>(m?.walkToMin ?? 5)
  const [mrtRide, setMrtRide] = useState<number | undefined>(m?.rideMin)
  const [mrtWalkFrom, setMrtWalkFrom] = useState<number | undefined>(m?.walkFromMin ?? 5)
  // Taxi
  const [taxiRide, setTaxiRide] = useState<number | undefined>(initial?.kind === 'taxi' ? initial.rideMin : undefined)

  const nearbyStops = useMemo(() => (bus ? stopsNear(bus, origin, 600, 8) : []), [bus, origin])
  const downstream = useMemo(() => (bus && board && service ? stopsAfter(bus, service, board) : []), [bus, board, service])
  const estimate = bus && board && service && alight ? estimateRideMin(bus, service, board, alight) : undefined

  const id = initial?.id ?? uid()
  const route: Route | undefined =
    kind === 'bus' ? (board && service && alight ? { id, kind, name: name || 'Home', service, boardStop: board, alightStop: alight, rideMin: busRide, walkFromMin: busWalkFrom ?? 0 } : undefined)
    : kind === 'mrt' ? (station.trim() && mrtRide ? { id, kind, name: name || 'Home', station: station.trim(), line, walkToMin: walkTo ?? 0, rideMin: mrtRide, walkFromMin: mrtWalkFrom ?? 0 } : undefined)
    : taxiRide ? { id, kind, name: name || 'Home', rideMin: taxiRide } : undefined

  return (
    <form className="editor" onSubmit={(e) => { e.preventDefault(); if (route) onSave(route) }}>
      <fieldset className="segmented" aria-label="How do you get there?">
        {(['bus', 'mrt', 'taxi'] as const).map((k) => (
          <label key={k} className={kind === k ? 'on' : ''}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            <Icon name={k === 'bus' ? 'bus' : k === 'mrt' ? 'train' : 'taxi'} size={18} />
            {k === 'bus' ? 'Bus' : k === 'mrt' ? 'MRT / LRT' : 'Taxi'}
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span className="field-label">Escaping to</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home, gym, mum's place…" maxLength={30} />
      </label>

      {kind === 'bus' && !bus && <p className="muted">Loading bus stops…</p>}
      {kind === 'bus' && bus && (
        <>
          {!board ? (
            <StopPicker bus={bus} origin={origin} suggested={nearbyStops} label="Board at" onPick={(s) => { setBoard(s.code); setService(undefined); setAlight(undefined) }} />
          ) : (
            <Picked label="Board at" title={bus.stops[board]?.name} sub={`${bus.stops[board]?.road} · ${board}`} onChange={() => { setBoard(undefined); setService(undefined); setAlight(undefined) }} />
          )}

          {board && (
            <div className="field">
              <span className="field-label">Which bus?</span>
              <div className="svc-grid" role="radiogroup" aria-label="Bus service">
                {(bus.servicesAt[board] ?? []).map((no) => (
                  <button key={no} type="button" role="radio" aria-checked={service === no} className={`svc-btn ${service === no ? 'on' : ''}`}
                    onClick={() => { setService(no); setAlight(undefined) }}>{no}</button>
                ))}
              </div>
            </div>
          )}

          {board && service && (!alight ? (
            <StopPicker bus={bus} suggested={downstream.slice(0, 40).map((c) => bus.stops[c]).filter(Boolean)} pool={downstream}
              label="Get off at" placeholder="Search stops on this route" onPick={(s) => setAlight(s.code)} />
          ) : (
            <Picked label="Get off at" title={bus.stops[alight]?.name} sub={`${bus.stops[alight]?.road} · ${alight}`} onChange={() => setAlight(undefined)} />
          ))}

          {alight && (
            <div className="row">
              <NumberField label="Ride time" value={busRide} onChange={setBusRide} placeholder={String(estimate ?? 20)}
                hint={busRide === undefined ? `Estimated ~${estimate ?? '?'} min. Change it if you know better.` : 'Your own timing.'} />
              <NumberField label="Walk after" value={busWalkFrom} onChange={setBusWalkFrom} hint="Stop to door" />
            </div>
          )}
        </>
      )}

      {kind === 'mrt' && (
        <>
          <label className="field">
            <span className="field-label">Station you board at</span>
            <input value={station} onChange={(e) => setStation(e.target.value)} placeholder="e.g. Lavender" maxLength={40} />
          </label>
          <div className="field">
            <span className="field-label">Line</span>
            <div className="svc-grid" role="radiogroup" aria-label="MRT line">
              {(Object.keys(LINE_NAMES) as MrtLine[]).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={line === l} className={`svc-btn line-${l} ${line === l ? 'on' : ''}`} onClick={() => setLine(l)} title={LINE_NAMES[l]}>{l}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <NumberField label="Walk to station" value={walkTo} onChange={setWalkTo} />
            <NumberField label="Train ride" value={mrtRide} onChange={setMrtRide} placeholder="25" hint="Platform to platform" />
            <NumberField label="Walk after" value={mrtWalkFrom} onChange={setMrtWalkFrom} />
          </div>
          <p className="hint">Live train alerts will plug in here once LTA DataMall is connected.</p>
        </>
      )}

      {kind === 'taxi' && (
        <NumberField label="Usual ride time" value={taxiRide} onChange={setTaxiRide} placeholder="20" hint="We'll add pickup time based on how many taxis are near you." />
      )}

      <div className="actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={!route}><Icon name="check" size={18} />{saveLabel}</button>
      </div>
    </form>
  )
}

function Picked({ label, title, sub, onChange }: { label: string; title?: string; sub: string; onChange: () => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="picked">
        <span><span className="option-title">{title}</span><span className="muted"> · {sub}</span></span>
        <button type="button" className="link" onClick={onChange}>Change</button>
      </div>
    </div>
  )
}
