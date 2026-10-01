# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Escape from CT Hub": a client-only React 19 + Vite PWA that answers "what's my fastest way home right now?" in Singapore. It compares the user's saved routes (bus, MRT, taxi) using live bus arrivals and weather, and recommends one. There is no backend; all data comes from public APIs fetched in the browser.

## Commands

```sh
npm run dev                      # Vite dev server
npm run build                    # tsc -b (type check) then vite build
npm run preview                  # serve the production build
npm test                         # vitest run (node environment)
npx vitest run src/lib/plan.test.ts      # one test file
npx vitest run -t "indexes services"     # tests matching a name
```

There is no linter configured. `tsc -b` (strict, `noUnusedLocals`, `noUnusedParameters`) is the check that matters.

The app is served under `base: '/escape-from-cthub/'` (see `vite.config.ts`), so the dev URL is `http://localhost:5173/escape-from-cthub/`. Asset paths in `index.html` are hardcoded with that prefix.

## Architecture

All logic lives in `src/lib/`; `src/components/` is presentation only. `src/App.tsx` is the wiring layer.

**Data flow in `App.tsx` (`Home`):**
1. `useAppState()` (`lib/store.ts`) holds the user's places, routes and current origin in localStorage under `efc:state:v1`. `undefined` state shows `Onboarding`.
2. Origin is either a saved place or live GPS (`state.from === 'gps'`, via `useGeolocation`), falling back to the first place.
3. `loadBusData()` (`lib/busData.ts`) fetches the static stop/service network from data.busrouter.sg once (memoized promise) and indexes it into `BusData`.
4. `usePolled()` (`lib/hooks.ts`) polls bus arrivals (30s, for every bus route's board stop plus nearby stops) and weather (5 min). It pauses while the tab is hidden, refetches on visibility/online, and caches the last good response in localStorage (`efc:cache:<key>`) so a flaky connection still shows data.
5. `deriveConditions()` (`lib/conditions.ts`) reduces the raw data.gov.sg readings to `Conditions` for the origin by picking the nearest station/area/region.
6. `plan()` (`lib/plan.ts`) is a pure function: `PlanInput` (now, routes, origin, bus data, arrivals, conditions) → `{ best, others, tips }`. Arrivals older than 3 minutes are dropped before planning.
7. The main card (`Verdict`) shows `state.primary` (a pinned route id) or, when unset or deleted, `plan().best`. Its switcher lists routes in saved order so buttons stay put; "Other ways out" lists every option in ranked order, and tapping one pins it.

**Planning model (`lib/plan.ts`):** each route becomes an `Option` with a `homeBy` time and a `score` = `homeBy` + outdoor walking minutes × a weather `exposurePenalty`. Options sort by status (`ok` < `loading` < `no-bus`) then score. Bus options need a catchable live arrival (arrives no sooner than the walk, with 30s grace; `hustle` flags tight ones). MRT wait comes from SGT time-of-day headways (`mrtWaitMin`); taxi wait from nearby taxi count (`taxiPickupMin`). Bus ride time uses the user's override or `estimateRideMin` (stop-to-stop distance at ~19 km/h).

**Domain types** are in `lib/types.ts`. `Route` is a discriminated union on `kind` (`'bus' | 'mrt' | 'taxi'`); `AppState` carries `version: 1`, and the store discards state with any other version, so a schema change needs a version bump or migration.

**External APIs** (`lib/api.ts`, `lib/busData.ts`): arrivelah2.busrouter.sg (live arrivals, de-duplicated because it repeats `subsequent` as `next2`), data.busrouter.sg (static network, cached StaleWhileRevalidate by the service worker), and data.gov.sg v2 real-time endpoints plus v1 taxi availability. `fetchWeather` uses `Promise.allSettled` and keeps partial data; it only throws if every call fails. `Conditions.rainKnown` is false when rain data is missing, so the UI never claims "Dry" or "Coast is clear" without data.

**Rate limits:** data.gov.sg allows roughly 6 requests per burst per IP without an API key (excess returns 429 without CORS headers, which shows up in the browser as a CORS error). Keep weather to five calls per refresh (PM2.5 comes from the `psi` endpoint), and note that `usePolled` reuses a cache younger than the poll interval on reload instead of refetching.

**Other entry points:** `?demo` in the URL (handled in `src/main.tsx`) writes `demoState()` from `lib/demo.ts` into storage and strips the query, giving a shareable CT Hub → Tampines setup.

## Tests

Tests are in `src/lib/*.test.ts` and cover the pure logic (`plan`, `busData`). They build a tiny `BusData` with `indexBusData()` and pin `now` to a fixed SGT timestamp, since `mrtWaitMin` depends on Singapore hour and weekday.

## Styling

`src/styles.css` is plain CSS with colour tokens on `:root`, overridden for dark mode under `prefers-color-scheme` and `[data-theme]`. In the horizontally scrolling `.chips` row, each `.chip` must stay `position: relative`; otherwise its absolutely positioned `.sr-only` label escapes the scroller and makes mobile browsers zoom the whole page out.

## Planned

Train disruption alerts from LTA DataMall. It needs an account key and blocks direct browser calls, so it will need a small proxy (for example a serverless function). The muted "Train alerts soon" chip and the hint in the MRT route editor mark where it plugs in.
