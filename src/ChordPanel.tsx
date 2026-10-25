import { ALL_CHORDS, suggest } from './subst'
import type { ChordEvent } from './timeline'

type Props = {
  events: ChordEvent[] // before substitution
  known: string[]
  subst: Record<string, string>
  onKnown: (known: string[]) => void
  onSubst: (subst: Record<string, string>) => void
  onAuto: () => void
}

export function ChordPanel({ events, known, subst, onKnown, onSubst, onAuto }: Props) {
  const counts = new Map<string, number>()
  for (const e of events) counts.set(e.chord, (counts.get(e.chord) ?? 0) + 1)

  const toggle = (c: string) => onKnown(known.includes(c) ? known.filter(k => k !== c) : [...known, c])
  const choose = (from: string, to: string) => {
    const next = { ...subst }
    if (to) next[from] = to; else delete next[from]
    onSubst(next)
  }

  return (
    <section className="panel">
      <h2>Chords I know</h2>
      <div className="chips">
        {ALL_CHORDS.map(c => (
          <button key={c} className={known.includes(c) ? 'on' : ''} onClick={() => toggle(c)}>{c}</button>
        ))}
      </div>

      <h2>
        Chords in this song <button onClick={onAuto} disabled={!known.length || !events.length}>Auto-replace unknown</button>
        <button onClick={() => onSubst({})} disabled={!Object.keys(subst).length}>Reset</button>
      </h2>
      <div className="rows">
        {[...counts].map(([c, n]) => {
          const ranked = suggest(c, known)
          const rest = ALL_CHORDS.filter(a => a !== c && !ranked.includes(a))
          return (
            <label key={c} className="chordrow">
              <b>{c}</b> <small>×{n}</small>
              <select value={subst[c] ?? ''} onChange={e => choose(c, e.target.value)}>
                <option value="">play as is{known.includes(c) ? ' (known)' : ''}</option>
                {ranked.length > 0 && <optgroup label="Chords I know">{ranked.map(k => <option key={k}>{k}</option>)}</optgroup>}
                <optgroup label="Any chord">{rest.map(k => <option key={k}>{k}</option>)}</optgroup>
              </select>
            </label>
          )
        })}
      </div>
    </section>
  )
}
