/** Common clock for YouTube and local audio. Chord lane + sync only talk to this. */
export interface Source {
  currentTime(): number
  playing(): boolean
  setRate(rate: number): void
  play(): void
  pause(): void
  seek(seconds: number): void
  destroy(): void
}
