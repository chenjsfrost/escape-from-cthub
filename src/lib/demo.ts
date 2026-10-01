import type { AppState } from './types'

/** A ready-made escape from CT Hub 2 (114 Lavender St) to Tampines. */
export const demoState = (): AppState => ({
  version: 1,
  places: [{ id: 'cthub', name: 'CT Hub', lat: 1.3115, lng: 103.8628 }],
  from: 'cthub',
  routes: [
    { id: 'd-bus', kind: 'bus', name: 'Tampines', service: '67', boardStop: '07369', alightStop: '76051', walkFromMin: 5 },
    { id: 'd-mrt', kind: 'mrt', name: 'Tampines', station: 'Lavender', line: 'EW', walkToMin: 7, rideMin: 22, walkFromMin: 5 },
    { id: 'd-taxi', kind: 'taxi', name: 'Tampines', rideMin: 20 },
  ],
})
