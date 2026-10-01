import { useEffect, useRef, useState } from 'react'
import type { BusData } from '../lib/busData'
import type { AppState, LatLng, Route } from '../lib/types'
import { routeIcon, routeTitle } from './format'
import { Icon } from './Icon'
import { PlaceEditor } from './PlaceEditor'
import { RouteEditor } from './RouteEditor'

type View = { kind: 'list' } | { kind: 'route'; route?: Route } | { kind: 'place' }

export function Manage({ open, onClose, state, setState, bus, origin }: {
  open: boolean
  onClose: () => void
  state: AppState
  setState: (s: AppState | undefined) => void
  bus?: BusData
  origin: LatLng
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<View>({ kind: 'list' })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setView({ kind: 'list' })
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  const saveRoute = (r: Route) => {
    const exists = state.routes.some((x) => x.id === r.id)
    setState({ ...state, routes: exists ? state.routes.map((x) => (x.id === r.id ? r : x)) : [...state.routes, r] })
    setView({ kind: 'list' })
  }

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-labelledby="manage-h">
      <header className="sheet-head">
        <h2 id="manage-h">{view.kind === 'list' ? 'Your escape plan' : view.kind === 'place' ? 'Add a place' : view.route ? 'Edit route' : 'Add a route'}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>

      {view.kind === 'route' && <RouteEditor bus={bus} origin={origin} initial={view.route} onSave={saveRoute} onCancel={() => setView({ kind: 'list' })} />}
      {view.kind === 'place' && (
        <PlaceEditor bus={bus} onCancel={() => setView({ kind: 'list' })}
          onSave={(p) => { setState({ ...state, places: [...state.places, p], from: p.id }); setView({ kind: 'list' }) }} />
      )}

      {view.kind === 'list' && (
        <div className="manage">
          <section>
            <h3 className="section-h">Routes</h3>
            <ul className="ways">
              {state.routes.map((r) => (
                <li key={r.id} className="way">
                  <span className={`mode-dot mode-${r.kind}`}><Icon name={routeIcon(r)} size={18} /></span>
                  <span className="way-main"><span className="way-title">{routeTitle(r)}</span><span className="way-sub">to {r.name}</span></span>
                  <span className="way-actions">
                    <button className="link" onClick={() => setView({ kind: 'route', route: r })}>Edit</button>
                    <button className="link link-danger" onClick={() => setState({ ...state, routes: state.routes.filter((x) => x.id !== r.id) })} aria-label={`Delete ${routeTitle(r)} to ${r.name}`}>Delete</button>
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn btn-secondary btn-block" onClick={() => setView({ kind: 'route' })}><Icon name="plus" size={18} />Add a route</button>
          </section>

          <section>
            <h3 className="section-h">Places you escape from</h3>
            <ul className="ways">
              {state.places.map((p) => (
                <li key={p.id} className="way">
                  <span className="mode-dot"><Icon name="pin" size={18} /></span>
                  <span className="way-main"><span className="way-title">{p.name}</span></span>
                  {state.places.length > 1 && (
                    <button className="link link-danger" onClick={() => {
                      const places = state.places.filter((x) => x.id !== p.id)
                      setState({ ...state, places, from: state.from === p.id ? places[0].id : state.from })
                    }}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
            <button className="btn btn-secondary btn-block" onClick={() => setView({ kind: 'place' })}><Icon name="plus" size={18} />Add a place</button>
          </section>

          <section className="danger-zone">
            <button className="link link-danger" onClick={() => { if (confirm('Clear all routes and places on this device?')) setState(undefined) }}>Start over</button>
          </section>
        </div>
      )}
    </dialog>
  )
}
