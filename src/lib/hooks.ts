import { useEffect, useRef, useState } from 'react'
import { readJSON, writeJSON } from './store'
import type { LatLng } from './types'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export type Polled<T> = { data?: T; at?: number; error?: unknown; loading: boolean; refresh: () => void }

/**
 * Fetch on an interval while the page is visible. The last good response is
 * kept in localStorage so a flaky connection still shows something useful.
 */
export function usePolled<T>(key: string | undefined, fetcher: () => Promise<T>, intervalMs: number): Polled<T> {
  const cacheKey = key && `efc:cache:${key}`
  const [state, setState] = useState<{ data?: T; at?: number; error?: unknown; loading: boolean }>(() => ({
    ...(cacheKey ? readJSON<{ data: T; at: number }>(cacheKey) : undefined),
    loading: !!key,
  }))
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cacheKey) return
    const cached = readJSON<{ data: T; at: number }>(cacheKey)
    setState({ ...cached, loading: true })
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let inFlight = false
    let failures = 0

    const run = async () => {
      if (inFlight || document.visibilityState === 'hidden') return
      clearTimeout(timer)
      inFlight = true
      setState((s) => ({ ...s, loading: true }))
      try {
        const data = await fetcherRef.current()
        if (cancelled) return
        const at = Date.now()
        writeJSON(cacheKey, { data, at })
        setState({ data, at, loading: false })
        failures = 0
      } catch (error) {
        if (!cancelled) setState((s) => ({ ...s, error, loading: false }))
        failures++
      }
      inFlight = false
      // Retry sooner after a failure, backing off up to the normal interval.
      if (!cancelled) timer = setTimeout(run, failures ? Math.min(intervalMs, 10_000 * 2 ** (failures - 1)) : intervalMs)
    }
    const onWake = () => document.visibilityState === 'visible' && Date.now() - lastAt() >= intervalMs && run()
    const lastAt = () => readJSON<{ at: number }>(cacheKey)?.at ?? 0
    // Reuse a fresh cache on reload instead of spending rate-limited requests.
    const age = Date.now() - lastAt()
    if (age < intervalMs && !tick) {
      setState((s) => ({ ...s, loading: false }))
      timer = setTimeout(run, intervalMs - age)
    } else run()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', run)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', run)
    }
  }, [cacheKey, intervalMs, tick])

  return { ...state, refresh: () => setTick((t) => t + 1) }
}

export function useGeolocation(enabled: boolean): { pos?: LatLng; error?: string } {
  const [out, setOut] = useState<{ pos?: LatLng; error?: string }>({})
  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setOut({ error: 'Location is not available on this device.' })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setOut({ pos: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (e) => setOut((o) => ({ ...o, error: e.code === e.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not find your location.' })),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])
  return out
}

export function getPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Location is not available on this device.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not find your location.')),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  })
}
