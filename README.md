# Elucidate · World Cup 2026 Sweepstake Draw

A polished React app that runs a **fair, animated sweepstake draw** for the 2026
FIFA World Cup, then tracks the tournament live:

- 🎲 **Pool-based draw** — all 48 nations are ranked by FIFA standing and split
  into strength pools; every player is dealt one team from each pool, so squads
  are balanced (not pure luck). Anticipates 8–10 players (4–5 teams each).
- 🎬 **Live animated draw** with country flags, flicker-and-lock reveals,
  confetti and a generated "stadium anthem" (mutable).
- 🏆 **Title Odds** — a Monte Carlo engine simulates the whole tournament
  thousands of times and shows each nation's live % chance of winning. It
  re-runs whenever a result is entered, so the numbers move as the cup unfolds.
- 📊 **Leaderboard** — players ranked by the **combined title chance** of their
  drawn nations (live).
- 🗓️ **Fixtures & Tables** — all 72 group games with editable scores and
  auto-computed group standings, each team badged with its owner.
- 🏟️ **Knockout bracket** — 32 qualifiers (12 winners + 12 runners-up + 8 best
  thirds) seeded by group form; enter knockout scores (with penalty-shootout
  resolution) and teams advance to the trophy. Title odds honour these results
  too, so they stay accurate to the final whistle.

## How results stay up to date

When the admin enters a score it's saved to the server (debounced). Every
viewer's page **pulls the latest shared state on load/refresh, auto-polls every
15 seconds, and re-fetches whenever the tab regains focus** — so a refresh
always shows current results with no manual sync. The tables, bracket, leaderboard
and title odds all recompute from that shared `scores` object. (Scores are
entered by the admin, not auto-scraped from a results feed.)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Locally there's no backend, so it runs in single-user mode (your draw + scores
are saved to your browser's localStorage).

## How the draw works

`src/data/teams.js` holds the 48 nations, FIFA-rank order and flag codes — edit
it freely. `src/lib/draw.js` sorts by rank, slices into pools of size
`= number of players`, and deals one team per pool to each player (re-shuffling
players per pool for fairness). With 48 teams ÷ 10 players, eight players get 5
teams and two get 4.

## Admin & locking the draw

The app is built to be shared with the whole team while staying locked:

- **Admin** = anyone who opens the site with `?admin=<ADMIN_KEY>` in the URL.
  Only the admin can run the draw and enter scores; those writes are saved to
  the server and pushed to everyone.
- **Everyone else** is read-only: they see the squads, odds and live tables but
  **cannot re-roll the draw or edit scores**.

`ADMIN_KEY` lives in two places and they must match:
- `src/config.js` → `ADMIN_KEY` (front-end gate)
- the `ADMIN_KEY` environment variable on the server (write authorisation)

Change both to something private before sharing the link.

## Deploying to Vercel (for the team)

This is a Vite front-end + one serverless function (`api/state.js`) backed by a
free Redis store for shared draw/scores.

1. **Import the repo** into Vercel (New Project → pick this GitHub repo).
   Framework preset auto-detects **Vite**; no build config needed.
2. **Add a database** for shared state: Project → **Storage** → **Upstash for
   Redis** (free tier) → connect. This injects `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically.
3. **Set the admin key**: Project → Settings → Environment Variables → add
   `ADMIN_KEY` = a private value, and set the same value in `src/config.js`.
4. **Deploy.** Share the plain URL with the team. Run the draw yourself by
   visiting `https://<your-app>.vercel.app/?admin=<ADMIN_KEY>`.

> Without the Redis store the app still works, but in local-only mode (no shared
> state). The shared/locked experience needs steps 2–3.

## Project structure

```
api/state.js          serverless GET/POST for shared draw + scores
src/data/teams.js     the 48 nations (rank, flag code, confederation)
src/lib/draw.js       pool-based allocation
src/lib/groups.js     groups, fixtures, standings
src/lib/forecast.js   Monte Carlo title-odds engine
src/lib/music.js      Web Audio stadium anthem for the draw
src/lib/api.js        front-end data layer (server + localStorage fallback)
src/components/*       Setup, DrawStage, Results, Leaderboard, TitleOdds, Fixtures
```

Flags are loaded from [flagcdn.com](https://flagcdn.com). Title odds are a
model, not bookmaker prices.
