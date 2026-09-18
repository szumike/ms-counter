# Counter

A small mobile-only PWA for counting the things you want to keep an eye on —
glasses of water, pushups, cigarettes skipped. Everything lives in the browser's
local storage; nothing leaves the device.

Built from the design in `docs/counter-app-design.html`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173 — open in a mobile viewport
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, bundle, and generate the service worker |
| `npm run preview` | Serve the production build (use this to test installability) |
| `npm test` | Vitest — pure logic plus jsdom flow tests |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate the PNG app icons from the SVG in `scripts/generate-icons.mjs` |

The layout targets phones only: a single column capped at 520px, safe-area
insets, and no desktop breakpoints.

## How it works

- **Storage** — one `localStorage` key, `ms-counter:v1`. Reads are validated
  field by field (`src/lib/storage.ts`), so a corrupt blob degrades to an empty
  state instead of bricking the app. Writes are debounced and flushed when the
  tab is hidden.
- **Daily reset** — counters roll over at the user's local midnight. The closing
  value is written into history, days the app was never opened record `0`, and
  today starts at zero. Rollover runs on launch, when the tab becomes visible,
  and from a timer re-armed at each midnight. History is kept for 60 days.
- **History chart** — `src/lib/chart.ts` builds the SVG paths for the 7/14/30
  day ranges, reading closed-out days from history and today's live value as the
  final point.
- **Theme** — System / Light / Dark, chosen in Settings. `System` tracks
  `prefers-color-scheme` live, and the `theme-color` meta tags follow so the
  status bar matches.
- **Offline** — `vite-plugin-pwa` precaches the shell and the self-hosted Hanken
  Grotesk subsets, so a cold offline launch renders correctly.

## Layout

```
src/
  lib/         date, chart, storage, goal and emoji helpers — all pure
  store/       reducer, persistence, rollover, theme
  screens/     list, detail, create/edit form, settings
  components/  tiles, stepper, chart card, pickers, toast, confirm sheet
scripts/       app-icon generation
```
