// Front-end admin key.
//
// Whoever opens the site with ?admin=<this value> in the URL becomes the admin:
// they can run the draw and enter scores, and those writes are sent to the
// server with this key. Everyone else is read-only — they can view the squads,
// odds and live tables but cannot re-roll the draw or change scores.
//
// IMPORTANT: this must match the ADMIN_KEY environment variable set on the
// server (Vercel). Change both to something private before sharing the link.
// With no server/database configured, the app runs in local-only mode and this
// key is ignored.

export const ADMIN_KEY = 'pahn'
