// Canonical list of sound files present in the repo. Loaded by index-v2.html
// and mixer.html so a missing/renamed MP3 is caught at boot instead of becoming
// a silent 404 at playback time.
//
// To add a sound: drop the .mp3 in repo root and append its base name (no
// extension) here. To rename: rename file + entry together. Order doesn't
// matter.
window.DESCENT_SOUNDS = Object.freeze([
  'abyss',
  'below-the-sea',
  'coral-reef',
  'dive-deep',
  'dolphin-song',
  'drone-filter',
  'factory-ambience',
  'humpback-whale',
  'industrial-spire',
  'machine-cycle',
  'metal-clanking',
  'metal-creak-long',
  'metal-creak-short',
  'pump-release',
  'spaceship-ambience',
  'trickling-loop',
  'underwater-ambience',
  'underwater-ambience-lake',
  'underwater-base',
  'underwater-choir',
  'valve-relief',
  'water-pipe',
  'whale-fx1',
  'whale-fx2',
  'whale-low',
  'whale-song',
]);
