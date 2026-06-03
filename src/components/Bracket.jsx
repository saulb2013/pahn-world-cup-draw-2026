import Flag from './Flag.jsx'
import { liveBracketTeams, buildKnockout } from '../lib/knockout.js'

export default function Bracket({ groups, fixtures, scores, setScore, editable }) {
  const { teams, complete } = liveBracketTeams(groups, fixtures, scores)
  const { rounds, champion } = buildKnockout(teams, scores)
  const canEdit = editable && complete

  const setVal = (id, side, value) => {
    const v = value === '' ? '' : Math.max(0, Math.min(99, Number(value)))
    setScore(id, side, v)
  }

  return (
    <div className="bracket-wrap">
      <div className="section-head">
        <h2>Knockout bracket</h2>
        <p>
          The 12 group winners, 12 runners-up and 8 best third-placed teams,
          seeded by group-stage form.{' '}
          {complete ? (
            <>Enter knockout scores to advance teams — odds update live.</>
          ) : (
            <strong>
              Provisional — projected from current standings. Locks for score
              entry once all group games are played.
            </strong>
          )}
        </p>
      </div>

      <div className="bracket-scroll">
        <div className="bracket">
          {rounds.map((round) => (
            <div className={`bk-col bk-${round.key}`} key={round.key}>
              <div className="bk-round-name">{round.name}</div>
              <div className="bk-matches">
                {round.matches.map((m) => {
                  const drawn =
                    m.a && m.b &&
                    m.home !== '' && m.home != null &&
                    m.away !== '' && m.away != null &&
                    Number(m.home) === Number(m.away)
                  return (
                    <div className="bk-match" key={m.id}>
                      <TeamRow
                        team={m.a}
                        score={m.home}
                        isWinner={m.winner && m.a && m.winner.code === m.a.code}
                        editable={canEdit}
                        onScore={(v) => setVal(m.id, 'home', v)}
                      />
                      <TeamRow
                        team={m.b}
                        score={m.away}
                        isWinner={m.winner && m.b && m.winner.code === m.b.code}
                        editable={canEdit}
                        onScore={(v) => setVal(m.id, 'away', v)}
                      />
                      {drawn && (
                        <div className="bk-pens">
                          {canEdit ? (
                            <>
                              <span>Pens:</span>
                              <button
                                className={m.pens === 'home' ? 'on' : ''}
                                onClick={() => setScore(m.id, 'pens', 'home')}
                              >
                                {m.a.name}
                              </button>
                              <button
                                className={m.pens === 'away' ? 'on' : ''}
                                onClick={() => setScore(m.id, 'pens', 'away')}
                              >
                                {m.b.name}
                              </button>
                            </>
                          ) : m.winner ? (
                            <span>{m.winner.name} win on pens</span>
                          ) : (
                            <span>level — awaiting shootout</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="bk-col bk-champion-col">
            <div className="bk-round-name">Champion</div>
            <div className="bk-champion">
              <div className="trophy">🏆</div>
              {champion ? (
                <>
                  <Flag code={champion.code} name={champion.name} size="w320" />
                  <div className="champ-name">{champion.name}</div>
                </>
              ) : (
                <div className="champ-tbd">To be decided</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamRow({ team, score, isWinner, editable, onScore }) {
  if (!team) {
    return (
      <div className="bk-team tbd">
        <span className="bk-name">TBD</span>
      </div>
    )
  }
  return (
    <div className={`bk-team ${isWinner ? 'win' : ''}`}>
      <Flag code={team.code} name={team.name} />
      <span className="bk-name">{team.name}</span>
      {editable ? (
        <input
          type="number"
          min="0"
          className="bk-score-input"
          value={score ?? ''}
          onChange={(e) => onScore(e.target.value)}
        />
      ) : (
        <span className="bk-score">{score ?? '–'}</span>
      )}
    </div>
  )
}
