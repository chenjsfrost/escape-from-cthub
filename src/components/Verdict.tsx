import type { Option, Tip } from '../lib/plan'
import { clock, LOAD_LABEL, minsUntil, routeIcon, routeTitle } from './format'
import { Icon, type IconName } from './Icon'

function quip(leaveIn: number, hustle: boolean): string {
  if (hustle) return 'Brisk walk. You can make it.'
  if (leaveIn === 0) return 'Out the door. Go, go, go.'
  if (leaveIn <= 3) return 'Bag packed? Shoes on?'
  if (leaveIn <= 8) return 'Start wrapping up.'
  return 'Time for one more email.'
}

const TIP_ICON: Record<Tip['kind'], IconName> = { rain: 'rain', thunder: 'thunder', haze: 'air', heat: 'sun', clear: 'sparkle' }

export function Tips({ tips }: { tips: Tip[] }) {
  return (
    <ul className="tips">
      {tips.map((t) => (
        <li key={t.kind} className={`tip tip-${t.tone}`}>
          <Icon name={TIP_ICON[t.kind]} size={18} />
          <span>{t.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function Verdict({ best, now, tips, loading }: { best?: Option; now: number; tips: Tip[]; loading: boolean }) {
  if (!best) {
    return (
      <section className="verdict verdict-empty" aria-busy={loading}>
        <p className="kicker">{loading ? 'Scouting escape routes' : 'No escape right now'}</p>
        <h1 className="big">{loading ? 'Hang tight…' : 'Hmm.'}</h1>
        <p className="sub">{loading ? 'Checking live buses and weather.' : 'None of your routes have a bus coming. They may have stopped for the night. Add a taxi route as a backup.'}</p>
      </section>
    )
  }

  const r = best.route
  const leaveIn = best.leaveInMin
  const totalMin = Math.max(1, Math.round((best.homeBy - now) / 60_000))
  const headline = best.hustle ? 'Go now!' : leaveIn === 0 ? 'Leave now' : `Leave in ${leaveIn} min`

  return (
    <section className="verdict" aria-labelledby="verdict-h">
      <p className="kicker">
        <span className={`mode mode-${r.kind}`}>
          <Icon name={routeIcon(r)} size={16} />
          {routeTitle(r)}
        </span>
        <span>to {r.name}</span>
      </p>
      <h1 id="verdict-h" className="big">{headline}</h1>
      <p className="sub">{quip(leaveIn, best.hustle)}</p>

      <div className="eta">
        <div>
          <span className="eta-label">Home by</span>
          <span className="eta-value">{clock(best.homeBy)}</span>
        </div>
        <div>
          <span className="eta-label">Door to door</span>
          <span className="eta-value">{totalMin} min</span>
        </div>
        {best.bus && (
          <div>
            <span className="eta-label">Bus arrives</span>
            <span className="eta-value">{minsUntil(best.bus.at, now) ? `${minsUntil(best.bus.at, now)} min` : 'Now'}</span>
          </div>
        )}
      </div>

      <ol className="legs" aria-label="Trip breakdown">
        {best.walkToMin > 0 && <li><Icon name="walk" size={16} />{best.walkToMin} min walk</li>}
        {best.waitMin > 0 && <li><Icon name="clock" size={16} />{best.waitMin} min {r.kind === 'taxi' ? 'pickup' : 'wait'}</li>}
        <li>
          <Icon name={routeIcon(r)} size={16} />
          {best.rideMin} min ride{best.rideEstimated ? ' (est.)' : ''}
          {best.bus && LOAD_LABEL[best.bus.load] && <span className={`load load-${best.bus.load}`}>{LOAD_LABEL[best.bus.load]}</span>}
        </li>
        {r.kind !== 'taxi' && r.walkFromMin > 0 && <li><Icon name="walk" size={16} />{r.walkFromMin} min</li>}
      </ol>

      <Tips tips={tips} />
    </section>
  )
}
