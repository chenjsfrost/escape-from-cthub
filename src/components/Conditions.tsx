import type { Conditions } from '../lib/types'
import { Icon, type IconName } from './Icon'

function Chip({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone?: 'warn' | 'muted' }) {
  return (
    <li className={`chip ${tone ? `chip-${tone}` : ''}`} title={label}>
      <Icon name={icon} size={16} />
      <span className="sr-only">{label}: </span>
      {value}
    </li>
  )
}

export function ConditionsStrip({ c, unavailable }: { c?: Conditions; unavailable?: boolean }) {
  if (!c) return <ul className="chips" aria-label="Conditions"><Chip icon="cloud" label="Weather" value={unavailable ? 'Weather unavailable, retrying' : 'Checking the sky…'} tone="muted" /></ul>
  const rain =
    !c.rainKnown ? { icon: 'cloud' as const, value: 'Rain data unavailable', tone: 'muted' as const }
    : c.rainNow === 'heavy' ? { icon: 'rain' as const, value: 'Heavy rain now', tone: 'warn' as const }
    : c.rainNow === 'light' ? { icon: 'rain' as const, value: 'Drizzling now', tone: 'warn' as const }
    : c.rainSoon ? { icon: c.thundery ? ('thunder' as const) : ('rain' as const), value: c.forecast ?? 'Rain soon', tone: 'warn' as const }
    : { icon: /cloud/i.test(c.forecast ?? '') ? ('cloud' as const) : ('sun' as const), value: c.forecast?.replace(/ \((Day|Night)\)/, '') ?? 'Dry', tone: undefined }
  return (
    <ul className="chips" aria-label="Conditions near you">
      <Chip icon={rain.icon} label="Rain" value={rain.value} tone={rain.tone} />
      {c.tempC !== undefined && <Chip icon="temp" label="Temperature" value={`${Math.round(c.tempC)}°C`} tone={c.tempC >= 33 ? 'warn' : undefined} />}
      {c.psi !== undefined && <Chip icon="air" label="PSI, 24-hour" value={`PSI ${c.psi}`} tone={c.psi > 100 ? 'warn' : undefined} />}
      {c.uv !== undefined && c.uv > 0 && <Chip icon="sun" label="UV index" value={`UV ${c.uv}`} tone={c.uv >= 8 ? 'warn' : undefined} />}
      {c.taxisNearby !== undefined && <Chip icon="taxi" label="Taxis within 500 m" value={`${c.taxisNearby} taxis near`} />}
      <Chip icon="train" label="Train alerts" value="Train alerts soon" tone="muted" />
    </ul>
  )
}
