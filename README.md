# Leonida Trophy Guide — GTA VI Platinum Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Owlvans/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Owlvans/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline trophy guide and tracker for all 55 PlayStation 5 trophies of
Grand Theft Auto VI, built for the make.fun bounty
[gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01).

## What it does

- **Checklist** of all 55 trophies with their official names, descriptions
  and grades (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden). Tick
  trophies off as you earn them — progress is saved in the browser's
  localStorage.
- **Filters and search** by kind (story, missable, collectibles, activities,
  side, free-roam, economy, platinum) plus free-text search.
- **Spoiler shield**: story trophies' names and descriptions stay blurred
  until you earn them (toggleable).
- **Per-trophy guide**: for every trophy, a guide in this entry's own words,
  ordered steps, a "When it unlocks" line, a "Pitfalls" line, the published
  sources it rests on (PowerPyx, KeenGamer, Push Square, GTA-Zone,
  PSNProfiles, Exophase), your own notes field, and — for the 21 trophies
  PlayStation tracks — an editable progress counter.
- **Missables, honestly labelled**: Positive Mental Attitude is the only
  potential missable (a Chapter 1 balcony meditation; the window closes
  when Chapter 1 ends). Actions Speak Louder was screened and cleared —
  its 500-choice counter is cumulative. Five trophies whose triggers the
  published guides do not confirm say exactly that in their guides.
- **Roadmap**: 8 stages covering all 55 trophies exactly once, each with a
  live progress bar and an effort note attributed to the cited guides.
- **Next up planner**: your next unearned trophies in roadmap order, the
  current stage, and what remains in it.
- **Platinum plan & sources**: the phases in order, the composition of the
  list, the long poles (500 choices, 42 Shooting Range golds, the 100%
  completion checklist), and a Sources & methodology panel explaining
  where the official list comes from (PlayStation's list as listed by
  Exophase and PSNProfiles) with links to the guides used.
- **Export / import**: download your progress (earned, counters, notes)
  as a JSON file and import it back on any browser.

The app makes no network requests at runtime: everything loads from the
files in `app/`, and source links open only if you follow them.

## Run it

Serve the `app/` folder with any static file server, for example:

    python3 -m http.server 8123 --directory app

then open http://localhost:8123 — or use the bundled server:

    node serve.ts

## Build the hand-in

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

This copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` there using `vendor/makefun-frontend.ts`.
