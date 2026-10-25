# FretBoardBuddy

Play guitar along with a song. Load a Guitar Pro tab and a YouTube link (or an mp3). FretBoardBuddy scrolls the chords in time with the music, so you always see what to play next.

FretBoardBuddy runs on your own computer. A small local server keeps your songs in a SQLite file, there is no account, and nothing is uploaded anywhere.

## Features

- **YouTube or your own audio:** play along with a YouTube video, or load an mp3 when a video blocks embedding. Both work the same way for chords, sync, speed, loops and shortcuts.
- **Chord lane:** chords scroll past a fixed playhead, with the current and next chord shown as fretboard diagrams. Click a diagram to try another voicing. Click the lane to jump around the song.
- **Tab view:** the tab for any track, with a moving playhead and click-to-seek.
- **Slow it down:** play at 0.25x, 0.5x or 0.75x. Chords stay in sync because they follow the player's clock.
- **Chord substitution:** tick the chords you know and press "Auto-replace unknown". Chords you can't play are swapped for the closest-sounding known chord, for example Bm becomes D and F#m becomes A. You can also pick any replacement per chord.
- **Sync tools:** tap-to-sync for the start of the song, nudge buttons for fine tuning, and a second tap to correct tempo drift.
- **Standard-tuning shapes:** if the tab is tuned down (for example a half step), chords can be shown as shapes for standard tuning.
- **Capo finder:** tell the app which chords you know and it suggests the capo fret that leaves the fewest chords you can't play.
- **A-B loop:** repeat a section, snapped to chord changes. Combine it with a slower speed to drill a hard change.
- **Fix one chord:** turn on "Edit chords" and click a card to change just that chord, instead of every occurrence.
- **Change warning:** a bar under the big chord counts down to the next chord, in real seconds at the current speed.
- **Keyboard shortcuts:** keep your hands on the guitar (see below).
- **Saved songs:** links, offsets, replacements, loops, tabs, mp3s and your known chords are kept in a SQLite file on your computer, so clearing browser data loses nothing and every browser sees the same songs.

## Run it

Needs Node 22.13 or newer (it uses Node's built-in `node:sqlite`).

```sh
npm install
npm run dev      # development, http://localhost:5173/
npm start        # build, then serve the built app, http://localhost:4173/
```

Use `localhost`, not `127.0.0.1`: YouTube refuses to play embedded videos on a raw IP address (player error 153).

Your data is stored in `data/fretboardbuddy.db` (set `FBB_DB` to use another path, `PORT` to change the `npm start` port). To back up, copy that file. It is not part of git. The server only answers requests from `localhost`.

If you used an earlier version that stored data in the browser, it is copied into the database automatically the first time you start the new version.

Other commands: `npm test`, `npm run build`, `npm run lint`.

## How to use

1. Choose a Guitar Pro file (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`).
2. Paste a YouTube link and press **Load video**, or choose an mp3. Use the mp3 if a video blocks embedding.
3. Play the video and pause right when the first chord sounds. Press **Chords start here**. Use the nudge buttons if it is a little early or late.
4. If the chords drift later in the song, press **This chord just started (fix drift)** exactly when a chord change sounds, at least 10 seconds in. The later you press it, the more accurate the fix.
5. Tick the chords you know in "Chords I know", then press **Auto-replace unknown**.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Left / Right | Seek 5 seconds back / forward |
| `,` / `.` | Nudge the sync offset 10 ms earlier / later |
| `-` / `=` | Slower / faster speed step |
| `[` / `]` | Set loop start (A) / end (B) |
| `\` | Clear the loop |
| `e` | Toggle "Edit chords" |

Click outside the video first. While the YouTube video has focus, YouTube gets the keys.

## How it works

- [alphaTab](https://www.alphatab.net/) reads the Guitar Pro file and draws the tab. Its audio player is not used.
- Chords come from chord labels in the file. Most tabs have none, so the app detects chords from the guitar and bass notes, reduced to major and minor triads. Detection is a guess: fix a wrong chord with its dropdown.
- Time maps as `media time = offset + stretch × tab time`. The offset comes from the first tap and the stretch from the second.
- YouTube is controlled through the YouTube IFrame Player API. An mp3 uses a plain `<audio>` element. Both sit behind one small `Source` interface in `src/player/`.
- Chord shapes come from [`@tombatossals/chords-db`](https://github.com/tombatossals/chords-db).
- A small local server (`server/api.mjs`, built on `node:sqlite`) stores songs, settings, tabs and mp3s in one SQLite file. In development it runs inside the Vite dev server.

## Project layout

| Path | What it does |
| --- | --- |
| `src/timeline.ts` | Score to chord events, with tempo-aware tick/ms conversion |
| `src/detect.ts` | Names a chord from notes |
| `src/subst.ts` | Suggests and applies chord substitutions |
| `src/sync.ts` | Offset and drift math |
| `src/player/` | YouTube and audio sources |
| `src/ChordLane.tsx`, `src/TabView.tsx`, `src/ChordDiagram.tsx`, `src/ChordPanel.tsx` | UI |
| `src/capo.ts` | Capo shapes and the best capo for your known chords |
| `src/loop.ts` | A-B loop snapping and wrap rule |
| `src/store.ts` | Saved songs and settings, kept in sync with the server |
| `src/migrate.ts` | One-time copy of old browser data into the database |
| `server/api.mjs` | SQLite API (songs, known chords, shapes, files) |
| `server/start.mjs` | Serves the built app and the API for `npm start` |

## Limits

- Chord detection is rough on arpeggios and lead lines.
- Drift correction handles steady tempo differences only, not a recording that speeds up and slows down.
- The loop jumps back with the player's own seek, so a very short gap is possible, especially on YouTube.
- Only major and minor chords are detected and offered.
- With a capo, the chord lane shows the shapes you finger, but the tab view always shows the file's real frets. Changing the capo clears your chord replacements and edits.
- The app needs its local server running; without it you get a message asking you to start it.
- If a file is tuned down, tune your guitar down to match the tab, or ignore the tab numbers and use the chord shapes.

## Guitar Pro files

Tabs are other people's transcriptions of copyrighted songs, so none are included. `.gitignore` excludes `*.gp*` files so that your local test tabs are not committed.

## License

MIT. See [LICENSE](LICENSE). The Bravura music font in `public/font/` is under the SIL Open Font License (see `public/font/Bravura-OFL.txt`).
