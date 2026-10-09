# Morning Routine Board — Design

Date: 2026-10-09
Status: draft, awaiting approval

## Intent

A morning routine checklist for two kids (ages 7 and 10), shown on a spare
tablet mounted on the kitchen wall. The kids tap tasks off themselves as they
get ready for school. Its one job is to show each kid what is still left to do
this morning, so the parent can say "go check the tablet" instead of listing
every step.

This is not a personal habit tracker. It is for the kids, not the parent.

## Goals

- From across the kitchen, each kid can see at a glance what they still have
  to do.
- A half-awake 7-year-old who reads shakily can use it alone: pictures, big
  buttons, almost no words.
- The parent sets it up once and then does not manage it. The board resets
  itself every morning.
- Runs entirely on the tablet. No accounts, no cloud, no data leaving the
  device.

## Non-goals

- Parent's own habits.
- Editing from a phone or any second device.
- Multiple households, multiple tablets, syncing.
- Native app or app-store distribution.
- Calendar or scheduling beyond "which weekdays does this task appear."
- Uploading custom images.

## Anti-goals (would make this a failure even if it technically works)

- Guilt. No streaks, no scores, no "you missed X yesterday," no broken-chain
  imagery. Yesterday is gone when today starts.
- Competition or comparison between the two kids. No leaderboards, no points,
  no rewards.
- Anything that makes the parent the operator. If the parent has to touch it on
  a normal morning, it has failed.
- Kids stumbling into settings and breaking the lists.

## Constraints

- Data lives only in the tablet's browser (local storage). Nothing is sent to
  any server.
- Must keep working with no internet after the first load.
- Must work in a tablet browser in landscape, full screen, with large tap
  targets usable by a 7-year-old holding toast.
- The parent does not care about the stack and asked for the simplest thing.

## How it is built (decided)

These were chosen by Claude and accepted by the parent as "whatever is
simplest."

- **Plain web page.** One `index.html` with its own CSS and JavaScript. No
  framework, no build step, no server-side code, no dependencies to install.
- **Storage.** Browser `localStorage`, holding two things: the configuration
  (kids and their task lists) and today's check-offs keyed by date.
- **Offline.** A service worker caches the page so it loads with no network,
  plus a web app manifest so "Add to Home Screen" opens it full screen without
  browser chrome.
- **Hosting.** Static files, deployable to GitHub Pages from this repo. The
  same folder can be served from any computer in the house instead if the
  parent wants nothing on the internet at all. Either way no data leaves the
  tablet; hosting only delivers the page.
- **Pictures are emoji.** Every task has an emoji chosen from a built-in
  palette in settings (toothbrush, shirt, backpack, dog, and so on). Each kid
  has a name, a color, and an emoji avatar. No image uploads.

## The board (main screen)

- Full-screen landscape page, two columns, one per kid, in a fixed order.
- Column header: kid's avatar emoji and name, in the kid's color.
- Below the header, the kid's tasks for today as a list of large tiles. Each
  tile shows the emoji, large, and a short label underneath. Nothing else on
  the tile.
- Tapping a tile marks it done. Tapping a done tile un-does it (mistakes
  happen).
- Done tiles do not disappear. They fade and drop to the bottom of the column,
  so undone tiles are always at the top and obvious from a distance.
- When every task in a column is done, the column shows a big check mark and
  "All done" in a cheerful, quiet tone. No confetti storms, no scores.
- If a kid has no tasks today (for example a weekend), the column shows
  "Nothing today."
- No visible navigation, menus, or text beyond the above. The only other
  element is a small, low-contrast gear in one corner (see Settings).
- The page should stay readable from a few meters away: large emoji, large
  text, strong contrast between done and undone.

## Days and the daily reset

- Each task has a set of weekdays it appears on. Settings shows these as a row
  of seven small toggles, Monday through Sunday, with Monday through Friday on
  by default. Example: "Swim kit" is Thursday only.
- A "day" for the board starts at 3:00 local time (Claude's call). Check-offs
  are stored against the board-day's date, so a check-off at 23:30 does not
  carry into the next morning, and one at 01:00 still counts as the night
  before.
- When the page is open and the clock crosses into a new board-day, the board
  refreshes itself without a reload. The board is expected to stay open on the
  wall for days at a time.
- Old days' check-offs are discarded. Nothing is kept for history, and nothing
  is shown about previous days.

## Settings (hidden)

- Opened by pressing and holding the corner gear for two seconds (Claude's
  call). A plain tap does nothing. This is meant to be hard to stumble into,
  not secure.
- Settings is a separate full-screen view on the same page, with a clear
  "Done" button that returns to the board.
- Per kid: edit name, pick color, pick avatar emoji.
- Per kid's task list: add a task, remove a task, rename a task, change its
  emoji, change its weekdays, reorder tasks (move up / move down buttons are
  fine; drag-and-drop is not required).
- Emoji picker: a fixed palette of a few dozen emoji relevant to morning
  routines, plus a free-text field for pasting any other emoji.
- Changes save immediately to local storage. No "save" step.
- A "Reset everything" option that clears all data, behind a confirmation.
- Settings has no effect on today's check-offs except: removing a task
  removes its check-off; adding one appears undone.

## First run

On a fresh tablet with no data, the board starts with two placeholder kids
("Kid 1", "Kid 2") and a sensible default list for each (for example: get
dressed, brush teeth, eat breakfast, pack bag, feed the dog), so there is
something on screen immediately and the parent edits rather than builds from
nothing.

## Left to the builder

- Exact visual design: colors, typography, spacing, animation on check-off.
  Keep it warm and quiet; avoid anything that looks like a game scoreboard.
- Exact emoji palette contents.
- The shape of the stored data and any versioning of it.
- How the service worker handles updates to the page after deployment.
- Test approach. There is no server, so tests are for the date/reset logic and
  the storage layer at minimum.
- Whether the board columns scroll or shrink when a kid has many tasks. Lists
  are expected to be short (five to ten items).
