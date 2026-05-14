# descent

Interactive narrative art piece. Three scenes — the world, the station, the eye — explored through sound, signals, and a 4.7-second heartbeat.

## entry points

| file | purpose |
|---|---|
| `index-v2.html` | the experience itself |
| `index.html` | older backup of the experience (kept intentionally) |
| `mixer.html` | live sound mixer — preview MP3s, design scenes |
| `designer.html` | vector shape editor — generates the polygon arrays used for creatures |

## running locally

The audio loader needs HTTP, not `file://`. From the repo root:

```sh
npm run dev       # opens index-v2.html
npm run mixer     # opens mixer.html
npm run designer  # opens designer.html
```

No build step, no dependencies. `npx http-server` is fetched on first run.

## controls (index-v2.html)

- click signals (pulsing dots) to listen, click again to dismiss
- click "ascend" once enough signals are collected
- **P** — guided tour mode (←/→ or space to advance)
- **⚙ settings** (bottom right) — volume, brightness, background

## stack

vanilla HTML + [p5.js](https://p5js.org/) 1.9.0 + [Tone.js](https://tonejs.github.io/) 14.8.49, loaded from cdnjs.
