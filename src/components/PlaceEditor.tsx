import { useMemo, useState } from 'react'
import { stopsNear, type BusData } from '../lib/busData'
import { getPosition } from '../lib/hooks'
import { uid } from '../lib/store'
import type { Place } from '../lib/types'
import { Icon } from './Icon'
import { StopPicker } from './StopPicker'

/** CT Hub 2, 114 Lavender St: a sensible starting point for suggestions. */
const DEFAULT_CENTER = { lat: 1.3115, lng: 103.8628 }

export function PlaceEditor({ bus, onSave, onCancel, saveLabel = 'Save place' }: { bus?: BusData; onSave: (p: Place) => void; onCancel?: () => void; saveLabel?: string }) {
  const [name, setName] = useState('Office')
  const [at, setAt] = useState<{ lat: number; lng: number; label: string }>()
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string>()
  const suggested = useMemo(() => (bus ? stopsNear(bus, DEFAULT_CENTER, 400, 5) : []), [bus])

  const locate = async () => {
    setLocating(true)
    setError(undefined)
    try {
      const p = await getPosition()
      setAt({ ...p, label: 'Your current location' })
    } catch (e) {
      setError(`${(e as Error).message} Pick a nearby bus stop instead.`)
    } finally {
      setLocating(false)
    }
  }

  return (
    <form className="editor" onSubmit={(e) => { e.preventDefault(); if (at) onSave({ id: uid(), name: name.trim() || 'Office', lat: at.lat, lng: at.lng }) }}>
      <label className="field">
        <span className="field-label">Call it</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office, school, CT Hub…" maxLength={24} />
      </label>

      {at ? (
        <div className="field">
          <span className="field-label">Where it is</span>
          <div className="picked">
            <span><Icon name="pin" size={16} /> <span className="option-title">{at.label}</span></span>
            <button type="button" className="link" onClick={() => setAt(undefined)}>Change</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="btn btn-secondary btn-block" onClick={locate} disabled={locating}>
            <Icon name="locate" size={18} />{locating ? 'Finding you…' : "I'm here now. Use my location"}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="or"><span>or pick the bus stop closest to it</span></p>
          {bus ? (
            <StopPicker bus={bus} suggested={suggested} label="Nearest bus stop" onPick={(s) => setAt({ lat: s.lat, lng: s.lng, label: `Near ${s.name}, ${s.road}` })} />
          ) : <p className="muted">Loading bus stops…</p>}
        </>
      )}

      <div className="actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={!at}><Icon name="check" size={18} />{saveLabel}</button>
      </div>
    </form>
  )
}
