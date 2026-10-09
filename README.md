# Morning Board

A morning routine checklist for two kids, shown on a spare iPad on the kitchen
wall. Each kid sees their own column of big emoji tiles and taps them off as
they get ready. The board resets itself every morning. There are no accounts,
no cloud and no history: everything lives in the iPad's browser storage.

Design notes: `docs/superpowers/specs/2026-10-09-morning-routine-board-design.md`.

## iPad setup

1. Open the board's URL in Safari (the GitHub Pages URL for this repo).
2. Tap Share, then **Add to Home Screen**, then Add.
3. Open it from the Home Screen icon. It runs full screen without the browser
   bar, and keeps working with no internet after this first load.
4. In Settings › Display & Brightness, set **Auto-Lock** to Never so the board
   stays on.
5. Turn the iPad to landscape and mount it.

## Parent settings

Press and hold the small gear in the bottom-right corner for two seconds. A
plain tap does nothing. From there you can rename each kid, pick their colour
and avatar, and add, remove, rename, reorder and re-emoji their tasks. Each
task has Mon–Sun toggles, so a Thursday-only "Swim kit" is one tap. Changes
save instantly; press Done to return to the board.

"Reset everything" at the bottom erases all data after a confirmation.

## Privacy

Nothing is sent anywhere. The lists and today's check-offs are stored in
Safari's website data for this page on the iPad itself. Clearing Safari's
website data erases them. Yesterday's check-offs are discarded when a new day
starts at 3am, and nothing about previous days is ever shown.

## Updating the app

1. Make your change.
2. Bump `CACHE` in `sw.js` (for example `mrb-v1` to `mrb-v2`).
3. Push to `main`. GitHub Pages redeploys automatically.
4. On the iPad, close and relaunch the board twice: the first launch fetches
   the new version in the background, the second runs it.

## Development

- Run the tests: `npm test` (Node 18 or newer, no dependencies).
- Preview locally: `python3 -m http.server 8080` in this folder, then open
  `http://localhost:8080/`.
- Everything is plain HTML, CSS and ES modules under `src/`. No build step.
