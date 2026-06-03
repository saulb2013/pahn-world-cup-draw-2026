import { flagUrl } from '../data/teams.js'

export default function Flag({ code, name, size = 'w160', className = '' }) {
  if (!code || code === 'tbd') {
    return (
      <span className={`flag flag-tbd ${className}`} title={name || 'To be confirmed'}>
        ?
      </span>
    )
  }
  return (
    <img
      className={`flag ${className}`}
      src={flagUrl(code, size)}
      alt={`${name} flag`}
      loading="lazy"
      width={40}
      height={30}
    />
  )
}
