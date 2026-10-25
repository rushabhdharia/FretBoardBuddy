export const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// beginner-friendly: only major/minor triads. 7ths/sus/power chords collapse into the nearest triad.
const TEMPLATES: [number[], string][] = [
  [[0, 4, 7], ''],
  [[0, 3, 7], 'm'],
]

/** Best chord name for weighted pitch classes (pc -> weight). Optional bass pc breaks ties and favors its root. */
export function detectChord(weights: Map<number, number>, bass?: number): string | null {
  const max = Math.max(0, ...weights.values())
  if (!max) return null
  // ponytail: drop faint pcs (passing notes) with a fixed 20% cutoff, tune if detection is noisy
  const pcs = new Set([...weights].filter(([, w]) => w >= max * 0.2).map(([pc]) => pc))
  let best: { name: string; score: number } | null = null
  for (let root = 0; root < 12; root++) {
    if (!pcs.has(root)) continue
    for (const [intervals, suffix] of TEMPLATES) {
      const chordPcs = intervals.map(i => (root + i) % 12)
      const hit = chordPcs.filter(pc => pcs.has(pc)).length
      const extra = [...pcs].filter(pc => !chordPcs.includes(pc)).length
      const score = hit - 1.5 * extra - (intervals.length - hit) + (root === bass ? 0.75 : 0)
      if (!best || score > best.score) best = { name: NAMES[root] + suffix, score }
    }
  }
  return best && best.score > 0 ? best.name : null
}
