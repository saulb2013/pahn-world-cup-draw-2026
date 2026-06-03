// The 48 qualified nations for the FIFA World Cup 2026, ordered by (approximate)
// FIFA World Ranking. `rank` drives the sweepstake pooling and knockout seeding.
// `code` is an ISO 3166-1 alpha-2 code used to load flags from flagcdn.com
// (England / Scotland use the special gb-eng / gb-sct codes). `conf` is the
// confederation. The official group allocation lives in src/lib/groups.js.

export const TEAMS = [
  { rank: 1, name: 'Argentina', code: 'ar', conf: 'CONMEBOL', points: 1886 },
  { rank: 2, name: 'Spain', code: 'es', conf: 'UEFA', points: 1875 },
  { rank: 3, name: 'France', code: 'fr', conf: 'UEFA', points: 1870 },
  { rank: 4, name: 'England', code: 'gb-eng', conf: 'UEFA', points: 1820 },
  { rank: 5, name: 'Brazil', code: 'br', conf: 'CONMEBOL', points: 1776 },
  { rank: 6, name: 'Portugal', code: 'pt', conf: 'UEFA', points: 1772 },
  { rank: 7, name: 'Netherlands', code: 'nl', conf: 'UEFA', points: 1754 },
  { rank: 8, name: 'Belgium', code: 'be', conf: 'UEFA', points: 1740 },
  { rank: 9, name: 'Germany', code: 'de', conf: 'UEFA', points: 1724 },
  { rank: 10, name: 'Croatia', code: 'hr', conf: 'UEFA', points: 1716 },
  { rank: 11, name: 'Morocco', code: 'ma', conf: 'CAF', points: 1710 },
  { rank: 12, name: 'Colombia', code: 'co', conf: 'CONMEBOL', points: 1696 },
  { rank: 13, name: 'Uruguay', code: 'uy', conf: 'CONMEBOL', points: 1681 },
  { rank: 14, name: 'Switzerland', code: 'ch', conf: 'UEFA', points: 1648 },
  { rank: 15, name: 'Japan', code: 'jp', conf: 'AFC', points: 1638 },
  { rank: 16, name: 'USA', code: 'us', conf: 'CONCACAF', points: 1635, host: true },
  { rank: 17, name: 'Senegal', code: 'sn', conf: 'CAF', points: 1630 },
  { rank: 18, name: 'Iran', code: 'ir', conf: 'AFC', points: 1606 },
  { rank: 19, name: 'Korea Republic', code: 'kr', conf: 'AFC', points: 1592 },
  { rank: 20, name: 'Mexico', code: 'mx', conf: 'CONCACAF', points: 1588, host: true },
  { rank: 21, name: 'Ecuador', code: 'ec', conf: 'CONMEBOL', points: 1581 },
  { rank: 22, name: 'Austria', code: 'at', conf: 'UEFA', points: 1572 },
  { rank: 23, name: 'Australia', code: 'au', conf: 'AFC', points: 1564 },
  { rank: 24, name: 'Norway', code: 'no', conf: 'UEFA', points: 1555 },
  { rank: 25, name: 'Türkiye', code: 'tr', conf: 'UEFA', points: 1545 },
  { rank: 26, name: 'Sweden', code: 'se', conf: 'UEFA', points: 1534 },
  { rank: 27, name: 'Scotland', code: 'gb-sct', conf: 'UEFA', points: 1525 },
  { rank: 28, name: 'Canada', code: 'ca', conf: 'CONCACAF', points: 1516, host: true },
  { rank: 29, name: 'Egypt', code: 'eg', conf: 'CAF', points: 1508 },
  { rank: 30, name: 'Panama', code: 'pa', conf: 'CONCACAF', points: 1498 },
  { rank: 31, name: 'Algeria', code: 'dz', conf: 'CAF', points: 1490 },
  { rank: 32, name: "Côte d'Ivoire", code: 'ci', conf: 'CAF', points: 1482 },
  { rank: 33, name: 'Paraguay', code: 'py', conf: 'CONMEBOL', points: 1474 },
  { rank: 34, name: 'Tunisia', code: 'tn', conf: 'CAF', points: 1466 },
  { rank: 35, name: 'Czechia', code: 'cz', conf: 'UEFA', points: 1458 },
  { rank: 36, name: 'Qatar', code: 'qa', conf: 'AFC', points: 1450 },
  { rank: 37, name: 'DR Congo', code: 'cd', conf: 'CAF', points: 1442 },
  { rank: 38, name: 'Saudi Arabia', code: 'sa', conf: 'AFC', points: 1434 },
  { rank: 39, name: 'Iraq', code: 'iq', conf: 'AFC', points: 1426 },
  { rank: 40, name: 'Uzbekistan', code: 'uz', conf: 'AFC', points: 1418 },
  { rank: 41, name: 'South Africa', code: 'za', conf: 'CAF', points: 1410 },
  { rank: 42, name: 'Bosnia and Herzegovina', code: 'ba', conf: 'UEFA', points: 1402 },
  { rank: 43, name: 'Jordan', code: 'jo', conf: 'AFC', points: 1394 },
  { rank: 44, name: 'Ghana', code: 'gh', conf: 'CAF', points: 1386 },
  { rank: 45, name: 'Cabo Verde', code: 'cv', conf: 'CAF', points: 1378 },
  { rank: 46, name: 'Curaçao', code: 'cw', conf: 'CONCACAF', points: 1360 },
  { rank: 47, name: 'Haiti', code: 'ht', conf: 'CONCACAF', points: 1345 },
  { rank: 48, name: 'New Zealand', code: 'nz', conf: 'OFC', points: 1320 },
]

export const flagUrl = (code, size = 'w160') =>
  `https://flagcdn.com/${size}/${code}.png`
