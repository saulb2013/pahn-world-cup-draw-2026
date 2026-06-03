// The 48 nations for the FIFA World Cup 2026, ordered by (approximate) FIFA
// World Ranking as of mid-2026. `rank` drives the pooling for the draw.
// `code` is an ISO 3166-1 alpha-2 code used to load flags from flagcdn.com
// (England / Scotland use the special gb-eng / gb-sct codes).
// `conf` is the confederation. Everything here is easy to edit.

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
  { rank: 12, name: 'Italy', code: 'it', conf: 'UEFA', points: 1702 },
  { rank: 13, name: 'Colombia', code: 'co', conf: 'CONMEBOL', points: 1696 },
  { rank: 14, name: 'Uruguay', code: 'uy', conf: 'CONMEBOL', points: 1681 },
  { rank: 15, name: 'USA', code: 'us', conf: 'CONCACAF', points: 1665, host: true },
  { rank: 16, name: 'Switzerland', code: 'ch', conf: 'UEFA', points: 1648 },
  { rank: 17, name: 'Mexico', code: 'mx', conf: 'CONCACAF', points: 1644, host: true },
  { rank: 18, name: 'Japan', code: 'jp', conf: 'AFC', points: 1638 },
  { rank: 19, name: 'Senegal', code: 'sn', conf: 'CAF', points: 1630 },
  { rank: 20, name: 'Denmark', code: 'dk', conf: 'UEFA', points: 1617 },
  { rank: 21, name: 'Iran', code: 'ir', conf: 'AFC', points: 1606 },
  { rank: 22, name: 'Korea Republic', code: 'kr', conf: 'AFC', points: 1592 },
  { rank: 23, name: 'Ecuador', code: 'ec', conf: 'CONMEBOL', points: 1581 },
  { rank: 24, name: 'Austria', code: 'at', conf: 'UEFA', points: 1572 },
  { rank: 25, name: 'Australia', code: 'au', conf: 'AFC', points: 1560 },
  { rank: 26, name: 'Canada', code: 'ca', conf: 'CONCACAF', points: 1552, host: true },
  { rank: 27, name: 'Norway', code: 'no', conf: 'UEFA', points: 1540 },
  { rank: 28, name: 'Egypt', code: 'eg', conf: 'CAF', points: 1531 },
  { rank: 29, name: 'Nigeria', code: 'ng', conf: 'CAF', points: 1524 },
  { rank: 30, name: 'Algeria', code: 'dz', conf: 'CAF', points: 1510 },
  { rank: 31, name: 'Ukraine', code: 'ua', conf: 'UEFA', points: 1502 },
  { rank: 32, name: 'Panama', code: 'pa', conf: 'CONCACAF', points: 1490 },
  { rank: 33, name: 'Saudi Arabia', code: 'sa', conf: 'AFC', points: 1481 },
  { rank: 34, name: 'Qatar', code: 'qa', conf: 'AFC', points: 1472 },
  { rank: 35, name: 'Scotland', code: 'gb-sct', conf: 'UEFA', points: 1463 },
  { rank: 36, name: 'Poland', code: 'pl', conf: 'UEFA', points: 1455 },
  { rank: 37, name: 'Paraguay', code: 'py', conf: 'CONMEBOL', points: 1447 },
  { rank: 38, name: 'Costa Rica', code: 'cr', conf: 'CONCACAF', points: 1438 },
  { rank: 39, name: 'Jamaica', code: 'jm', conf: 'CONCACAF', points: 1429 },
  { rank: 40, name: 'Tunisia', code: 'tn', conf: 'CAF', points: 1420 },
  { rank: 41, name: 'Cameroon', code: 'cm', conf: 'CAF', points: 1412 },
  { rank: 42, name: 'Ivory Coast', code: 'ci', conf: 'CAF', points: 1404 },
  { rank: 43, name: 'Ghana', code: 'gh', conf: 'CAF', points: 1396 },
  { rank: 44, name: 'Iraq', code: 'iq', conf: 'AFC', points: 1388 },
  { rank: 45, name: 'Uzbekistan', code: 'uz', conf: 'AFC', points: 1379 },
  { rank: 46, name: 'New Zealand', code: 'nz', conf: 'OFC', points: 1370 },
  { rank: 47, name: 'DR Congo', code: 'cd', conf: 'CAF', points: 1361 },
  { rank: 48, name: 'Bolivia', code: 'bo', conf: 'CONMEBOL', points: 1352 },
]

export const flagUrl = (code, size = 'w160') =>
  `https://flagcdn.com/${size}/${code}.png`
