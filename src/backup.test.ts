import { describe, expect, it } from 'vitest'
import { parseBackup, type Backup } from './backup'

const good: Backup = {
  version: 1,
  songs: { 'yt:abc': { key: 'yt:abc', title: 't', source: { type: 'youtube', url: 'u', id: 'abc' }, gpName: 'a.gp', offset: 1, speed: 1, standard: true, subst: {} } },
  known: ['A', 'D'],
  voicing: { A: 1 },
  gp: { 'yt:abc': 'AAEC' },
}

describe('parseBackup', () => {
  it('round trips', () => expect(parseBackup(JSON.stringify(good))).toEqual(good))
  it('rejects non-JSON', () => expect(() => parseBackup('nope')).toThrow(/not JSON/))
  it('rejects wrong version and non-objects', () => {
    expect(() => parseBackup('[]')).toThrow(/version/)
    expect(() => parseBackup(JSON.stringify({ ...good, version: 2 }))).toThrow(/version/)
  })
  it('rejects malformed parts', () => {
    expect(() => parseBackup(JSON.stringify({ ...good, songs: { x: { key: 1 } } }))).toThrow(/songs/)
    expect(() => parseBackup(JSON.stringify({ ...good, known: [1] }))).toThrow(/known/)
    expect(() => parseBackup(JSON.stringify({ ...good, gp: { a: 5 } }))).toThrow(/tab files/)
  })
})
