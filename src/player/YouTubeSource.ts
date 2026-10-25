import type { Source } from './source'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

export function parseVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    if (u.hostname.endsWith('youtube.com'))
      return u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ?? null
  } catch { /* not a URL */ }
  return null
}

let apiReady: Promise<void> | undefined
const loadApi = () => (apiReady ??= new Promise(resolve => {
  if (window.YT?.Player) return resolve()
  window.onYouTubeIframeAPIReady = resolve
  const s = document.createElement('script')
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.append(s)
}))

// https://developers.google.com/youtube/iframe_api_reference#onError
const ERRORS: Record<number, string> = {
  100: 'YouTube error 100: video removed or private. Try another link, or use an mp3.',
  101: 'YouTube error 101: owner blocked embedding. Use an mp3 instead.',
  150: 'YouTube error 150: owner blocked embedding. Use an mp3 instead.',
  152: 'YouTube error 152: video not playable here (embedding or region restriction). Use an mp3 instead.',
  153: 'YouTube error 153: player could not verify the page origin. Reload; if it persists use an mp3.',
}

export async function createYouTubeSource(el: HTMLElement, videoId: string): Promise<Source> {
  await loadApi()
  const player = await new Promise<any>((resolve, reject) => {
    const p = new window.YT.Player(el, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
      events: {
        onReady: () => resolve(p),
        onError: (e: { data: number }) => reject(new Error(ERRORS[e.data] ?? `YouTube error ${e.data}`)),
      },
    })
  })
  return {
    currentTime: () => player.getCurrentTime(),
    playing: () => player.getPlayerState() === 1,
    setRate: (r) => { player.setPlaybackRate(r) },
    play: () => { player.playVideo() },
    pause: () => { player.pauseVideo() },
    seek: (s) => { player.seekTo(s, true) },
    destroy: () => { player.destroy() },
  }
}
