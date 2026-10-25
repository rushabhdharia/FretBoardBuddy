import guitar from '@tombatossals/chords-db/lib/guitar.json'

type Position = { frets: number[]; fingers: number[]; baseFret: number; barres: number[] }
type Entry = { suffix: string; positions: Position[] }
const DB = guitar.chords as unknown as Record<string, Entry[]>

// our names use sharps, the db uses flats for the black keys (and spells C#/F# as Csharp/Fsharp)
const DB_KEY: Record<string, string> = { C: 'C', 'C#': 'Csharp', D: 'D', 'D#': 'Eb', E: 'E', F: 'F', 'F#': 'Fsharp', G: 'G', 'G#': 'Ab', A: 'A', 'A#': 'Bb', B: 'B' }

export function voicings(chord: string): Position[] {
  const m = chord.match(/^([A-G]#?)(m?)$/)
  if (!m) return []
  return DB[DB_KEY[m[1]]]?.find(e => e.suffix === (m[2] ? 'minor' : 'major'))?.positions ?? []
}

const FRETS = 4, SX = 16, SY = 16, TOP = 22, LEFT = 14

/** Click the diagram to cycle through other voicings. */
export function ChordDiagram({ chord, index, onIndex, small }: { chord: string; index: number; onIndex: (i: number) => void; small?: boolean }) {
  const all = voicings(chord)
  if (!all.length) return null
  const i = index % all.length
  const p = all[i]
  const w = LEFT * 2 + SX * 5, h = TOP + SY * FRETS + 10
  return (
    <svg className="diagram" width={small ? w * 0.6 : w} height={small ? h * 0.6 : h} viewBox={`0 0 ${w} ${h}`}
      onClick={() => onIndex((i + 1) % all.length)}>
      <title>{`${chord} shape ${i + 1}/${all.length} (click for another)`}</title>
      {p.baseFret === 1
        ? <line x1={LEFT} x2={LEFT + SX * 5} y1={TOP} y2={TOP} stroke="#e8e8ea" strokeWidth={3} />
        : <text x={0} y={TOP + SY * 0.7} fontSize={11} fill="#e8e8ea">{p.baseFret}</text>}
      {Array.from({ length: FRETS + 1 }, (_, f) => <line key={f} x1={LEFT} x2={LEFT + SX * 5} y1={TOP + f * SY} y2={TOP + f * SY} stroke="#667" />)}
      {Array.from({ length: 6 }, (_, s) => <line key={s} x1={LEFT + s * SX} x2={LEFT + s * SX} y1={TOP} y2={TOP + FRETS * SY} stroke="#889" />)}
      {p.barres.map(b => {
        const strings = p.frets.map((f, s) => (f === b ? s : -1)).filter(s => s >= 0)
        return <rect key={b} x={LEFT + Math.min(...strings) * SX - 5} width={(Math.max(...strings) - Math.min(...strings)) * SX + 10}
          y={TOP + (b - 0.5) * SY - 5} height={10} rx={5} fill="#ffcc3d" />
      })}
      {p.frets.map((f, s) => f > 0
        ? <circle key={s} cx={LEFT + s * SX} cy={TOP + (f - 0.5) * SY} r={5} fill="#ffcc3d" />
        : <text key={s} x={LEFT + s * SX} y={TOP - 6} fontSize={11} textAnchor="middle" fill="#e8e8ea">{f === 0 ? 'o' : 'x'}</text>)}
    </svg>
  )
}
