# DESCENT — AI Handover Briefing

Compact, structured briefing for another AI picking up work on this project. All file paths relative to repo root.

---

## Project basics

- **Repo:** `Chant-1-1/descent` (GitHub Pages: https://chant-1-1.github.io/descent/)
- **Stack:** vanilla HTML + p5.js 1.9.0 + Tone.js 14.8.49 from cdnjs. No build step.
- **Run locally:** `npm run dev` (= `npx http-server -c-1 -p 8080 -o /index-v2.html`)
- **Main file:** `index-v2.html` (~2000 lines, single-file inline scripts)

## Files

| Path | Purpose |
|---|---|
| `index-v2.html` | The experience itself |
| `mixer.html` | Sound + text mixer (writes localStorage; index reads on boot) |
| `designer.html` | Vector shape editor (polygon arrays for creatures) |
| `moondance.html` | Separate ArUco-marker-triggered video page (js-aruco2) |
| `sounds.js` | `window.DESCENT_SOUNDS` — auto-generated; do not hand-edit |
| `scripts/sync-sounds.js` | Run via `npm run sounds:sync` after dropping new MP3s |
| `audio-config.default.json` | Backup snapshot of original audio + text config |
| `Solar Speculation Story line.canvas` | Obsidian canvas of the full story map |
| `*.mp3` | 26 audio files in repo root |

## Story arc

```
Process matrix intro (~15s)
   ↓ auto-finish or click-skip
Title screen
   ↓ click → Tone.start() + initAudio() + drone bridge fades in
Scene 0 · "the world"
   ↓ ascend (after ≥3 hotspots visited)
Scene 1 · "the station"
   ↓ ascend → silence hours interlude (4s, outside pres-mode)
Scene 2 · "the eye"
   ↓ ascend → eyeClimax (not a scene transition)
Climax: Phase A → Phase B (gaze detection) → Phase C (look | undecided | away)
```

Scene index uses `scene = 0|1|2` for world/station/eye. UI labels: `i · the world`, `ii · the station`, `iii · the eye`.

## Scene 0 · the world

- `getSceneHotspots(0)` returns 3 hotspots: `shrinking_belt`, `deep_parade`, `sea_level`
- Each hotspot has `q` (quote) shown in viz, viz function in `drawVizBelt|Parade|Sea`
- Environment: 3 wild sea devils + 2 caged + 3 whales + 5 fish swarms + 350 particles
- `MAX_CREATURES=24` cap for click-spawned creatures
- mouseY → `depthFilter.frequency` (lowpass 380..7500 Hz)
- Idle whisper: every ~25s of no interaction, random from `['awake.','remember.','ascend.','listen.']`
- `sceneRequired[0]=3` → after 3 hotspots visited, `ascendVisible=true`

## Scene 1 · the station

- `getSceneHotspots(1)` returns 4: `hierarchy`, `daily_life`, `air_oxygen`, `the_mothers`
- HTML diorama `#station-html-bg` shown under the canvas
- **No flashlight overlay** (was removed); scene is normally lit
- `drawStationInterior()` draws red lamp glow + downward cone + station elements (lights/drips/gauges/mist)
- Red multiply blend overlay at `globalAlpha=0.4` over the room (in draw loop, gated `if(scene===1)`)
- **Hull song system** (`generateHullPieces`, `drawHullPieces`, `triggerHullPiece`, `triggerHullChain`):
  - 30 pieces, 6 sounds cycled from `hullPalette` (mixer config)
  - Baseline shimmer + hover ring; streak of 3+ clicks in 10s shows resonance ring
  - 7 clicks → cascade wave top→bottom + subtitle:
    - 1st cascade: `"the station sings back."`
    - 2nd: `"they're listening below."`
    - 3rd+: `"the deep answers."`
  - First-entry whisper after 6.5s: `"the walls answer when struck."`
  - First-click whisper: `"the workers know this language."`
- **Morning touch**: 300ms after `buildScene(1)`, plays `morningTouchPlayer` (default `metal-creak-short @ −12dB`). Flag `scene2EntryPlayed` resets on scene change.
- `sceneRequired[1]=4` → ascend after 4 hotspots

## Scene 2 · the eye

- `getSceneHotspots(2)` returns 2: `mythology`, `selection`
- `drawEyeBackground()`: vertical beam + altar rings (pulse on `pulse47Phase`) + dust/embers
- `sceneRequired[2]=2`
- Ascend triggers `eyeClimax`, NOT a scene transition

## 4.7s heartbeat (`HEARTBEAT_MS = 4700`)

`pulse47Phase = (millis() % HEARTBEAT_MS) / HEARTBEAT_MS` — recomputed every draw frame.
Used by: cage lure flashes (`drawCages`), altar rings (`drawEyeBackground`), eye climax Phase B progress arc.

## Silence hours (station → eye transition)

- Triggered when `scene===1 && target===2 && !presMode` in `startTransition`
- Adds 4s near-silence before eye audio rises
- Custom players: `silenceUnderwaterPlayer` (loop), `silenceCreakPlayer` (one-shot)
- See `updateTransition` for full timing (t=0..4000ms commented inline)
- `silenceHours` flag suppresses normal `updateSceneAudio` ramping while active

## Eye climax (`drawEyeClimax`)

Three phases tracked by `eyeClimaxPhase` ∈ `'A'|'B'|'C'` and `eyePhaseStart`:

- **A (~3.2s)**: beam intensifies; watcher-mother subtitle uses `eyeLabel` from `computeLabel()`
- **B (4.7s = 1 heartbeat)**: gaze detection. `LOOK_R=210` px around `(width/2, height*0.4)`. Tracks `eyeLookFrames = {total, looking}`. At end: ratio → `eyeLookResult` ∈ `'look'|'undecided'|'away'` (thresholds 0.55, 0.25).
- **C** branches:
  - `look` → bright white flash → black → text `"light."` → sets `seenLight=true`
  - `undecided` → black → `"i didn't decide."`
  - `away` → fade → `"i looked away."`

`seenLight=true` triggers `drawSeenLightOverlay()` (permanent faint warm overlay).

## Behavior tracking → label

```js
userBehavior = {
  hotspotsVisited, timeInScenes, seaDevilsCaptured,
  hullSongClicks, cursorStillness, lookedAtIt
}
```

`computeLabel()` currently returns only one label if `hullSongClicks >= 7`:
```js
{ label: 'the noise-maker', verb: 'strike the walls' }
```
Other branches are open for future expansion (more thresholds against the other behavior fields).

## Audio architecture

All players created in `initAudio()`, runs on title-click. Routing:
```
layer/hotspot/hull players → hotspotRev or layer gain
                          → depthFilter → glitchFX → Tone.Destination
```

- `sceneBuses[name]` — one Gain per scene, crossfaded by `updateSceneAudio()`
- `layerPlayers[name][i]` — looping scene layers; started at `Tone.loaded()`
- `layerStartMs[name][i]` — per-layer delay (from mixer config); scheduled by `updateSceneAudio`
- `hotspotPlayers[vizId]` — one-shot per hotspot, routed through `hotspotRev`
- `hullPlayers[soundName]` — hull-tap sounds, keyed by sound name
- **Moments**: `morningTouchPlayer`, `silenceUnderwaterPlayer`, `silenceCreakPlayer`, `processDronePlayer` — named, configurable in mixer (dB volume)
- **Viz ambient**: `vizPlayers[vizId][]` — pre-created if `vizCfg[vizId].hasOwnSound`. On `Hotspot.activate`, `startVizAmbient(vizId)` ducks the scene bus to `sceneDuck/100` and starts the layers with stagger.

## Mixer-driven config

Single localStorage key: `descent-mixer-config-v2`. Schema:

```js
{
  scenes:    [{id, title, layers: [{def, vol(0..100), startMs}]}],
  hotspots:  [{vizId, name, def}],
  moments:   { morningTouch|silenceUnderwater|silenceCreak|processDrone:
                 {def, volDb, loop, label} },
  hullPalette: [6 sound names or null],
  vizConfig: { [vizId]: {hasOwnSound, sceneDuck(0..100),
                           layers: [{def, vol, startMs}]} },
  text:      { intro|subtitle|quote|nav|process|viz|system:
                 {font, size, color, alpha, ls, lh, weight, italic} }
}
```

`index-v2.html` reads it at the top of `initAudio()` (audio) and at the top of the inline script before audio init (text). Missing/invalid sections fall back to hardcoded `FALLBACK_*` constants.

## Text system

Seven categories, each applied as either CSS variables (HTML) or JS values (canvas):

- **HTML categories** (CSS-injected `<style>` at boot): `intro`, `subtitle`, `nav`, `process`, `system`
- **Canvas categories** (read inside draw functions): `quote` (full control — drawn in `drawVisualization`), `viz` (only `textFont` is set globally before each viz draw)

Google Fonts loaded on-demand for any non-system family. Curated list in mixer's `FONT_OPTIONS`.

## Process intro (first ever screen)

Pre-experience overlay (z-index 2500) over the start-overlay (z 2000). Pure CSS + JS IIFE in `<script>` block above the main inline script. 10 axes, 10 highlights paced 1/sec, auto-finish at t=13500ms or click-skips. Removes itself from DOM. **No audio** (autoplay blocked pre-gesture).

## Robustness layer (already in)

- CDN `onerror` handlers show readable failure in start-overlay
- Viewport meta + touch listeners (mobile-capable)
- `prefers-reduced-motion`: disables glitch FX + various keyframes
- ARIA labels on scene buttons + sliders + settings toggle
- Boot validator warns on missing MP3 references (against `window.DESCENT_SOUNDS`)
- `__dbg(e)` swallow helper; toggle `window.DEBUG=true` to log silent catches

## Presentation mode (P key)

`presMode=true` enables a guided sequence stepping through quotes, vizes, transitions, and the climax via `PRES_STEPS[]` array. `goToStep(idx)` handles each step. Suppresses silence hours and various idle-based triggers.

## Performance notes

If you touch hot draw code, these patterns are already in place — preserve them:

- `__resizeCache` for `drawVizSea` pts + `drawVizBelt` continent projections (per-resize, not per-frame)
- Static canvas gradients cached in `drawStationInterior`, `drawEyeBackground`
- `Hotspot.display` takes `isFirstUnvisited` boolean (caller does a plain for-loop, not closure-based `.find()`)
- In-place splice for `deepCreatures` cleanup (not `.filter` rebuild)
- Bounded `fillRect` for any flashlight-style masked overlay (never full-screen)

## moondance.html (separate AR page)

- ArUco marker detection via js-aruco2, dictionary `'ARUCO'` (original, markers from chev.me/arucogen)
- `MARKER_ACTIONS = {`
  - `0: { type:'video', src:'moondance.mp4', mode:'live' },`
  - `4: { type:'flash', mode:'oneshot' }`
  - `}`
- 300ms tolerance against detection dropouts (`MARKER_LOST_TOLERANCE_MS`)
- Per-marker action dispatched via switch in `startAction`/`stopAction`
- Canvas black at rest; video as HTML overlay z-index 10; flash overlay z-index 50; debug overlay z-index 1000
- `DEBUG` flag at top: camera preview + marker polygons + status text
- Action types currently implemented: `video`, `flash`. `sound` and `scene` are TODO stubs.

## Known gotchas

1. **Two working trees**: AI-side CI sandbox repo and user's local Windows repo at `C:\Users\lukas\Documents\GitHub\descent`. They can drift. Always check `git status` + `git log origin/main` before assuming state.
2. **`localStorage` is per-browser per-origin** — mixer + index-v2 live on same origin so they share. Tweaks in mixer require a refresh of index-v2 to take effect.
3. **Browser autoplay** blocks any audio before first user gesture (the title click). Process intro must be silent.
4. **`Tone.loaded()`** vs immediate start: scene loops start when buffers load, not when scene activates. `updateSceneAudio` only controls bus gains.
5. **Order matters in `initAudio`**: `sceneDef` must be in module scope before `updateSceneAudio` runs. There's been one ReferenceError bug (validator referenced `hsDef` before declaration) that took multiple commits to surface — re-check order if you add config readers.
6. **GitHub Pages cache**: ~30s–2min after push to `main` before live URL updates. Hard-reload (Cmd/Ctrl+Shift+R) to bypass browser cache.

## How to make changes

1. Most user-facing settings (sounds, text, hotspot sound, viz ambient) → use the mixer, no code changes
2. Adding a hotspot to a scene → edit `getSceneHotspots()` + add matching `vizId` to mixer's `DEFAULT_HOTSPOTS` and `DEFAULT_VIZ_CONFIG`
3. New viz drawing → add `drawVizX(a)` function + case in `drawVisualization` dispatch
4. Test by running `npm run dev`, click title, navigate to your hotspot
5. Push to `main` directly (no PR workflow currently); GitHub Pages auto-deploys

---

End of briefing. Story content (full quotes etc.) is best read directly from `getSceneHotspots()` in `index-v2.html` and from the Obsidian canvas `Solar Speculation Story line.canvas`.
