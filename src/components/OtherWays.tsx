import type { Option } from '../lib/plan'
import { clock, routeIcon, routeTitle } from './format'
import { Icon } from './Icon'

/** Every route at a glance, fastest first. Tapping one shows it on the main card. */
export function OtherWays({ options, best, shownId, onSelect }: { options: Option[]; best?: Option; shownId?: string; onSelect: (id: string) => void }) {
  if (options.length < 2) return null
  return (
    <section className="card" aria-labelledby="other-h">
      <h2 id="other-h" className="section-h">Other ways out</h2>
      <ul className="ways">
        {options.map((o) => {
          const shown = o.route.id === shownId
          return (
            <li key={o.route.id}>
              <button type="button" className={`way way-btn ${o.status !== 'ok' ? 'way-off' : ''} ${shown ? 'way-on' : ''}`}
                aria-current={shown || undefined} onClick={() => onSelect(o.route.id)}>
                <span className={`mode-dot mode-${o.route.kind}`}><Icon name={routeIcon(o.route)} size={18} /></span>
                <span className="way-main">
                  <span className="way-title">
                    {routeTitle(o.route)}
                    {o === best && <span className="badge">Fastest</span>}
                  </span>
                  <span className="way-sub">to {o.route.name}{shown ? ' · showing' : ''}</span>
                </span>
                <span className="way-right">
                  {o.status === 'ok' ? (
                    <>
                      <span className="way-eta">home {clock(o.homeBy)}</span>
                      <span className="way-sub">{o.leaveInMin === 0 ? 'leave now' : `leave in ${o.leaveInMin} min`}</span>
                    </>
                  ) : o.status === 'loading' ? (
                    <span className="way-sub">checking…</span>
                  ) : (
                    <span className="way-sub">not running now</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
