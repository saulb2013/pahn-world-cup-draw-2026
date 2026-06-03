# Deploy to Vercel (developer handoff)

This is a Vite app + one serverless function (`api/state.js`) backed by Upstash
Redis. The database is already created and tested — you just import, paste the
environment variables, and deploy. ~10 minutes, nothing to configure in code.

## Steps

1. **Import the repo into Vercel** — vercel.com → *Add New → Project* → pick this
   GitHub repo. The framework auto-detects **Vite** (build `vite build`, output
   `dist`). Leave all build settings as-is.

2. **Add Environment Variables** (Project → *Settings → Environment Variables*,
   scope = Production). Saul will give you the four values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `FOOTBALL_DATA_KEY`
   - `ADMIN_KEY`

   > Do **not** commit these to the repo. The database (Upstash Redis) is
   > already provisioned — you do **not** need to create one.

3. **Deploy** (or Redeploy so it picks up the env vars). Send Saul the URL.

That's it. No "Storage" step, no marketplace, no config files.

## After deploy (Saul does this)

- Run the official draw once at `https://<app>.vercel.app/?admin=<ADMIN_KEY>`.
- Share the **plain** URL (no `?admin=`) with the team — they're read-only and
  can't re-draw or edit.

Once live, group results pull in automatically from football-data.org every
couple of minutes, and the knockout bracket fills in automatically too — no
manual score entry.

## If you ever change `ADMIN_KEY`

It must match in **two** places: the Vercel env var **and** the `ADMIN_KEY`
constant in `src/config.js`. Change both, then redeploy.
