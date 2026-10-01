import type { Option } from '../lib/plan'
import { clock, routeIcon, routeTitle } from './format'
import { Icon } from './Icon'

export function OtherWays({ options }: { options: Option[] }) {
  if (!options.length) return null
  return (
    <section className="card" aria-labelledby="other-h">
      <h2 id="other-h" className="section-h">Other ways out</h2>
      <ul className="ways">
        {options.map((o) => {
          const leaveIn = o.leaveInMin
          return (
            <li key={o.route.id} className={`way ${o.status !== 'ok' ? 'way-off' : ''}`}>
              <span className={`mode-dot mode-${o.route.kind}`}><Icon name={routeIcon(o.route)} size={18} /></span>
              <span className="way-main">
                <span className="way-title">{routeTitle(o.route)}</span>
                <span className="way-sub">to {o.route.name}</span>
              </span>
              <span className="way-right">
                {o.status === 'ok' ? (
                  <>
                    <span className="way-eta">home {clock(o.homeBy)}</span>
                    <span className="way-sub">{leaveIn === 0 ? 'leave now' : `leave in ${leaveIn} min`}</span>
                  </>
                ) : o.status === 'loading' ? (
                  <span className="way-sub">checking…</span>
                ) : (
                  <span className="way-sub">not running now</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
