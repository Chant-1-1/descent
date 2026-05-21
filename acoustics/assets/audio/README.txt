Drop your 2–3 techno tracks into this folder.

Default filenames expected by src/audio/tracks.js:
  track-01.mp3
  track-02.mp3
  track-03.mp3

To use different names, edit src/audio/tracks.js and update the `url`
fields accordingly. Paths there are resolved relative to /assets/audio/
via Vite's `publicDir` (configured in vite.config.js).

Any web-decodable audio format works (mp3, ogg, m4a, wav). MP3 ~128–192 kbps
is enough for visualisation.
