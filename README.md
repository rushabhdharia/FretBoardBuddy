# FretBoardBuddy

Play guitar along with a song. Load a Guitar Pro tab and a YouTube link (or an mp3). FretBoardBuddy scrolls the chords in time with the music, so you always see what to play next.

Everything runs in your browser. There is no server and no account.

## Features

- **Chord lane:** chords scroll past a fixed playhead, with the current and next chord shown as fretboard diagrams. Click a diagram to try another voicing. Click the lane to jump around the song.
- **Tab view:** the tab for any track, with a moving playhead and click-to-seek.
- **Slow it down:** play at 0.25x, 0.5x or 0.75x. Chords stay in sync because they follow the player's clock.
- **Chord substitution:** tick the chords you know and press "Auto-replace unknown". Chords you can't play are swapped for the closest-sounding known chord, for example Bm becomes D and F#m becomes A. You can also pick any replacement per chord.
- **Sync tools:** tap-to-sync for the start of the song, nudge buttons for fine tuning, and a second tap to correct tempo drift.
- **Standard-tuning shapes:** if the tab is tuned down (for example a half step), chords can be shown as shapes for standard tuning.
- **Saved songs:** links, offsets, replacements and your known chords are remembered in the browser.

## Run it

Needs Node 20 or newer.

```sh
npm install
npm run dev
```

Open **http://localhost:5173/**. Use `localhost`, not `127.0.0.1`: YouTube refuses to play embedded videos on a raw IP address (player error 153).

Other commands: `npm test`, `npm run build`, `npm run lint`.

## How to use

1. Choose a Guitar Pro file (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`).
2. Paste a YouTube link and press **Load video**, or choose an mp3. Use the mp3 if a video blocks embedding.
3. Play the video and pause right when the first chord sounds. Press **Chords start here**. Use the nudge buttons if it is a little early or late.
4. If the chords drift later in the song, press **This chord just started (fix drift)** exactly when a chord change sounds, at least 10 seconds in. The later you press it, the more accurate the fix.
5. Tick the chords you know in "Chords I know", then press **Auto-replace unknown**.

## How it works

- [alphaTab](https://www.alphatab.net/) reads the Guitar Pro file and draws the tab. Its audio player is not used.
- Chords come from chord labels in the file. Most tabs have none, so the app detects chords from the guitar and bass notes, reduced to major and minor triads. Detection is a guess: fix a wrong chord with its dropdown.
- Time maps as `media time = offset + stretch × tab time`. The offset comes from the first tap and the stretch from the second.
- YouTube is controlled through the YouTube IFrame Player API. An mp3 uses a plain `<audio>` element. Both sit behind one small `Source` interface in `src/player/`.
- Chord shapes come from [`@tombatossals/chords-db`](https://github.com/tombatossals/chords-db).
- Settings are stored in `localStorage`. The tab file and any mp3 are stored in IndexedDB.

## Project layout

| Path | What it does |
| --- | --- |
| `src/timeline.ts` | Score to chord events, with tempo-aware tick/ms conversion |
| `src/detect.ts` | Names a chord from notes |
| `src/subst.ts` | Suggests and applies chord substitutions |
| `src/sync.ts` | Offset and drift math |
| `src/player/` | YouTube and audio sources |
| `src/ChordLane.tsx`, `src/TabView.tsx`, `src/ChordDiagram.tsx`, `src/ChordPanel.tsx` | UI |
| `src/store.ts` | Saved songs and settings |

## Limits

- Chord detection is rough on arpeggios and lead lines.
- Drift correction handles steady tempo differences only, not a recording that speeds up and slows down.
- Only major and minor chords are detected and offered.
- The tab view shows the file's real frets. If the file is tuned down, tune your guitar down to match the tab, or ignore the tab numbers and use the chord shapes.

## Guitar Pro files

Tabs are other people's transcriptions of copyrighted songs, so none are included. `.gitignore` excludes `*.gp*` files so that your local test tabs are not committed.

## License

MIT. See [LICENSE](LICENSE). The Bravura music font in `public/font/` is under the SIL Open Font License (see `public/font/Bravura-OFL.txt`).
