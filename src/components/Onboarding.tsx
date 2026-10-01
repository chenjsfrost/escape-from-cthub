import { useState } from 'react'
import type { BusData } from '../lib/busData'
import { demoState } from '../lib/demo'
import type { AppState, Place } from '../lib/types'
import { Icon, Logo } from './Icon'
import { PlaceEditor } from './PlaceEditor'
import { RouteEditor } from './RouteEditor'

export function Onboarding({ bus, onDone }: { bus?: BusData; onDone: (s: AppState) => void }) {
  const [step, setStep] = useState<'hello' | 'place' | 'route'>('hello')
  const [place, setPlace] = useState<Place>()

  if (step === 'hello') {
    return (
      <main className="onboard hello">
        <Logo size={72} />
        <h1 className="display">Plan your escape.</h1>
        <p className="lead">One glance tells you the fastest way home <em>right now</em>: live buses, rain, haze and all.</p>
        <ul className="promise">
          <li><Icon name="bus" />Ranks your usual ways home, live</li>
          <li><Icon name="rain" />Warns you before the rain does</li>
          <li><Icon name="clock" />Tells you exactly when to walk out</li>
        </ul>
        <div className="stack">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep('place')}>Set up my escape <span className="muted-on">· 1 min</span></button>
          <button className="btn btn-ghost btn-block" onClick={() => onDone(demoState())}>Just looking? Try the CT Hub demo</button>
        </div>
        <p className="fineprint">Everything stays on this device. No sign-up.</p>
      </main>
    )
  }

  return (
    <main className="onboard">
      <p className="step">Step {step === 'place' ? 1 : 2} of 2</p>
      {step === 'place' ? (
        <>
          <h1 className="display-sm">Where do you escape from?</h1>
          <p className="lead">Your office, school or anywhere you spend the day. Saving it means indoor GPS can't let you down.</p>
          <PlaceEditor bus={bus} saveLabel="Next" onSave={(p) => { setPlace(p); setStep('route') }} onCancel={() => setStep('hello')} />
        </>
      ) : place && (
        <>
          <h1 className="display-sm">How do you usually get home?</h1>
          <p className="lead">Start with your go-to. You can add backups, like the MRT or a taxi, later.</p>
          <RouteEditor bus={bus} origin={place} saveLabel="Start escaping" onCancel={() => setStep('place')}
            onSave={(r) => onDone({ version: 1, places: [place], from: place.id, routes: [r] })} />
        </>
      )}
    </main>
  )
}
