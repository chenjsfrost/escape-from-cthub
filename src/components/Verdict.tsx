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

export function routeShort(r: Option['route']): string {
  return r.kind === 'bus' ? `Bus ${r.service}` : r.kind === 'mrt' ? (r.line === 'LRT' ? 'LRT' : `${r.line} line`) : 'Taxi'
}

function Switcher({ options, best, primary, onSelect }: { options: Option[]; best?: Option; primary?: string; onSelect: (id?: string) => void }) {
  if (options.length < 2) return null
  // Keep the switcher in the user's own route order so buttons don't jump around as rankings change.
  return (
    <div className="switcher" role="group" aria-label="Show route">
      <button type="button" className={`switch ${!primary ? 'on' : ''}`} aria-pressed={!primary} onClick={() => onSelect(undefined)}>
        <Icon name="sparkle" size={16} />Fastest
      </button>
      {options.map((o) => (
        <button key={o.route.id} type="button" className={`switch ${primary === o.route.id ? 'on' : ''}`} aria-pressed={primary === o.route.id}
          onClick={() => onSelect(o.route.id)} title={`${routeTitle(o.route)} to ${o.route.name}`}>
          <Icon name={routeIcon(o.route)} size={16} />{routeShort(o.route)}
          {o === best && <span className="sr-only"> (fastest)</span>}
        </button>
      ))}
    </div>
  )
}

export function Verdict({ shown, best, options, primary, onSelect, now, tips, loading }: {
  /** The option on the card: the pinned primary route, or the fastest. */
  shown?: Option
  best?: Option
  /** All options in the user's saved order, for the switcher. */
  options: Option[]
  primary?: string
  onSelect: (id?: string) => void
  now: number
  tips: Tip[]
  loading: boolean
}) {
  const switcher = <Switcher options={options} best={best} primary={primary} onSelect={onSelect} />

  if (!shown || (shown.status !== 'ok' && !primary)) {
    return (
      <section className="verdict verdict-empty" aria-busy={loading}>
        {switcher}
        <p className="kicker">{loading ? 'Scouting escape routes' : 'No escape right now'}</p>
        <h1 className="big">{loading ? 'Hang tight…' : 'Hmm.'}</h1>
        <p className="sub">{loading ? 'Checking live buses and weather.' : 'None of your routes have a bus coming. They may have stopped for the night. Add a taxi route as a backup.'}</p>
      </section>
    )
  }

  const r = shown.route
  const isBest = shown === best
  const kicker = (
    <p className="kicker">
      <span className={`mode mode-${r.kind}`}>
        <Icon name={routeIcon(r)} size={16} />
        {routeTitle(r)}
      </span>
      <span>to {r.name}</span>
      {isBest && options.length > 1 && <span className="badge">Fastest</span>}
    </p>
  )
  const faster = best && !isBest && (
    <p className="faster">
      <span>
        <strong>{routeShort(best.route)}</strong> gets you home
        {shown.status === 'ok' ? ` ${Math.max(1, Math.round((shown.homeBy - best.homeBy) / 60_000))} min sooner` : ' instead'}.
      </span>
      <button type="button" className="link" onClick={() => onSelect(undefined)}>Show fastest</button>
    </p>
  )

  if (shown.status !== 'ok') {
    return (
      <section className="verdict verdict-empty" aria-busy={shown.status === 'loading'}>
        {switcher}
        {kicker}
        <h1 className="big">{shown.status === 'loading' ? 'Checking…' : 'Not running'}</h1>
        <p className="sub">{shown.status === 'loading' ? 'Fetching live arrivals.' : `No ${routeTitle(r)} you can catch right now.`}</p>
        {faster}
      </section>
    )
  }

  const leaveIn = shown.leaveInMin
  const totalMin = Math.max(1, Math.round((shown.homeBy - now) / 60_000))
  const headline = shown.hustle ? 'Go now!' : leaveIn === 0 ? 'Leave now' : `Leave in ${leaveIn} min`

  return (
    <section className={`verdict ${isBest ? '' : 'verdict-alt'}`} aria-labelledby="verdict-h">
      {switcher}
      {kicker}
      {/* Keyed so the headline eases in again when switching routes. */}
      <div key={r.id} className="verdict-body">
        <h1 id="verdict-h" className="big">{headline}</h1>
        <p className="sub">{quip(leaveIn, shown.hustle)}</p>

        <div className="eta">
          <div>
            <span className="eta-label">Home by</span>
            <span className="eta-value">{clock(shown.homeBy)}</span>
          </div>
          <div>
            <span className="eta-label">Door to door</span>
            <span className="eta-value">{totalMin} min</span>
          </div>
          {shown.bus && (
            <div>
              <span className="eta-label">Bus arrives</span>
              <span className="eta-value">{minsUntil(shown.bus.at, now) ? `${minsUntil(shown.bus.at, now)} min` : 'Now'}</span>
            </div>
          )}
        </div>

        <ol className="legs" aria-label="Trip breakdown">
          {shown.walkToMin > 0 && <li><Icon name="walk" size={16} />{shown.walkToMin} min walk</li>}
          {shown.waitMin > 0 && <li><Icon name="clock" size={16} />{shown.waitMin} min {r.kind === 'taxi' ? 'pickup' : 'wait'}</li>}
          <li>
            <Icon name={routeIcon(r)} size={16} />
            {shown.rideMin} min ride{shown.rideEstimated ? ' (est.)' : ''}
            {shown.bus && LOAD_LABEL[shown.bus.load] && <span className={`load load-${shown.bus.load}`}>{LOAD_LABEL[shown.bus.load]}</span>}
          </li>
          {r.kind !== 'taxi' && r.walkFromMin > 0 && <li><Icon name="walk" size={16} />{r.walkFromMin} min</li>}
        </ol>

        {faster}
        <Tips tips={tips} />
      </div>
    </section>
  )
}
