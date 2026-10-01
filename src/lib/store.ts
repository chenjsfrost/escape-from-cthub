import { useCallback, useState } from 'react'
import type { AppState } from './types'

const KEY = 'efc:state:v1'

export const uid = () => Math.random().toString(36).slice(2, 10)

export function readJSON<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or storage full: the app still works for this session.
  }
}

export function useAppState(): [AppState | undefined, (s: AppState | undefined) => void] {
  const [state, setState] = useState<AppState | undefined>(() => {
    const s = readJSON<AppState>(KEY)
    return s?.version === 1 ? s : undefined
  })
  const set = useCallback((s: AppState | undefined) => {
    writeJSON(KEY, s)
    setState(s)
  }, [])
  return [state, set]
}
