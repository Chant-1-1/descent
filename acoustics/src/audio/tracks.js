// Track manifest. The build & runtime read /assets/audio/* lazily — drop MP3s
// in that folder and add them here. If the file is not present in the folder
// when running `npm run dev`, AudioEngine.loadTrack() will surface the fetch
// error in the console.
//
// The "tags" field is purely informational (used in track list display).

export const TRACKS = [
  {
    id: 'track-01',
    name: 'Track 01 — Berghain Drift',
    url: '/audio/track-01.mp3',
    tags: ['techno', '128 bpm', 'low-end heavy'],
  },
  {
    id: 'track-02',
    name: 'Track 02 — Industrial Pulse',
    url: '/audio/track-02.mp3',
    tags: ['techno', '132 bpm', 'mid bright'],
  },
  {
    id: 'track-03',
    name: 'Track 03 — Crystal Dust',
    url: '/audio/track-03.mp3',
    tags: ['techno', '140 bpm', 'treble flux'],
  },
];
