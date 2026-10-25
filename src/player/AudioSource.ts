import type { Source } from './source'

export function createAudioSource(file: File): Source {
  const url = URL.createObjectURL(file)
  const audio = new Audio(url)
  audio.preservesPitch = true
  return {
    currentTime: () => audio.currentTime,
    playing: () => !audio.paused && !audio.ended,
    setRate: r => { audio.playbackRate = r },
    play: () => void audio.play(),
    pause: () => audio.pause(),
    seek: s => { audio.currentTime = s },
    destroy: () => { audio.pause(); URL.revokeObjectURL(url) },
  }
}
