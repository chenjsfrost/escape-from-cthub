# Escape from CT Hub

One glance before you pack up tells you **the fastest way home right now**, whether the weather should change your plans, and exactly when to walk out the door.

Built for anyone in Singapore leaving the place they spend the day. The name comes from CT Hub on Lavender Street.

## What it does

- **Ranks your escape routes live.** Save your usual ways home (bus, MRT/LRT, taxi) once. Bus ride times are estimated from stop distances, and you can override them.
- **Verdict first.** A big "Leave in 4 min · Bus 67 · home by 6:42pm", with the alternatives ranked below.
- **Advice that reacts to conditions.** Rain, thundery weather, haze and heat push walking-heavy routes down the ranking and change the advice.
- **All buses nearby.** Live arrivals at stops within 400 m.
- **Works offline-ish.** Shows the last data with "updated 2 min ago" when the signal drops. Installable as an app on iOS and Android.
- **No login.** Routes and places stay in your browser.

Try it without setup: open the app with `?demo` for a ready-made CT Hub → Tampines plan.

## Data

| Need | Source |
|---|---|
| Bus arrivals | [arrivelah](https://github.com/cheeaun/arrivelah) |
| Bus stops and routes | [BusRouter SG data](https://github.com/cheeaun/busrouter-sg) |
| Rain, 2-hour forecast, temperature, UV, PSI/PM2.5 | [data.gov.sg real-time APIs](https://guide.data.gov.sg/developer-guide/real-time-apis) |
| Taxis nearby | data.gov.sg taxi availability |
| Train disruptions | *Planned:* LTA DataMall (needs an account key and a small proxy) |

data.gov.sg rate-limits requests without an API key, so the app makes five weather calls per refresh, refreshes every 5 minutes, and reuses its cached data on reload.

## Development

```sh
npm install
npm run dev     # http://localhost:5173/escape-from-cthub/
npm test        # ranking engine tests
npm run build
```

The ranking logic lives in `src/lib/plan.ts` and is pure, so it's easy to test. Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
