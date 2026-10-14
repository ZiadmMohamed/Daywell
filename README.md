# Daywell

A calm desktop companion for Windows 10 and 11: a beautiful clock with a desktop widget, a Pomodoro focus timer, hydration reminders and Islamic prayer times. Everything runs locally and works offline.

## Features

- **Clock** — five distinct designs (Minimal, Flip, Retro, Neon, Nature), 12/24-hour time, optional seconds and date, custom font, text colour, solid or image background, adjustable size.
- **Full-screen clock** — press F11 (or the button on the clock) for an immersive full-screen clock with a quiet next-prayer and focus line; controls and the cursor hide when the mouse rests. Esc or F11 exits.
- **Desktop widget** — a frameless, transparent clock that stays on the desktop: drag to move, drag the corner grip to resize, optional always-on-top, adjustable opacity, optional click-through. It never takes keyboard focus and remembers its position, size and visibility.
- **Focus** — Pomodoro timer (25/5/15, long break after 4 by default; all configurable), start/pause/resume/reset/skip, optional auto-start, sound and notifications, today's sessions and focus time.
- **Hydration** — daily goal, configurable quick-add amounts plus custom amounts, today's entries, 7-day history, reminders with interval, quiet hours and pause.
- **Prayer times** — Fajr, Dhuhr, Asr, Maghrib and Isha calculated locally with [adhan](https://github.com/batoulapps/adhan-js) from the configured city or coordinates, timezone and method (12 methods), Shafiʿi/Hanafi Asr, high-latitude rule and per-prayer minute adjustments. Next prayer with live countdown; notifications at prayer time and optionally before it. The Athan only plays if you enable it and choose an audio file.
- **Tray** — open the app, show/hide the widget, start/pause focus, log water, see the next prayer, exit. Closing the window keeps Daywell running in the tray.
- **Light and dark themes**, reduced-motion support, keyboard navigation, English and Arabic (right-to-left).

## Requirements

- Windows 10 or 11 (x64)
- For development: Node.js 22.12+ (developed with Node 24) and npm

## Development

```bash
npm install
npm run dev        # start with hot reload
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript, main + renderer
npm run lint       # ESLint
```

> If Electron starts as plain Node (errors such as `Cannot read properties of undefined (reading 'whenReady')`), your shell has `ELECTRON_RUN_AS_NODE` set — some editor-integrated terminals do this. Unset it first (`Remove-Item Env:ELECTRON_RUN_AS_NODE` in PowerShell).

## Building the installer

```bash
npm run build:win   # → dist/Daywell-Setup-<version>.exe
npm run build:dir   # unpacked app in dist/win-unpacked (quicker to test)
```

The installer is a per-user NSIS installer with Start Menu and desktop shortcuts. It is not code-signed, so Windows SmartScreen will warn on first run.

To regenerate the icons after editing the SVG in `scripts/generate-icons.cjs`: `npx electron scripts/generate-icons.cjs`.

## Data

All data stays on your computer in `%APPDATA%\Daywell`:

- `daywell.db` — SQLite database (settings, focus sessions, water entries, notification log)
- `assets\` — copies of background images and Athan audio you choose
- `daywell.db.bak-v<N>` — automatic backup written before any schema upgrade

Uninstalling keeps this folder so a reinstall continues where you left off. Delete it manually for a completely clean slate.

## Architecture

```
src/
  shared/     Pure, framework-free logic used by both processes (fully unit tested)
    pomodoro/   timestamp-based state machine
    hydration/  totals, progress, reminder timing
    prayer/     adhan wrapper, next-prayer selection, city list
    scheduling/ event model, due/missed resolution, prayer event planning
    time/       formatting, calendar-date keys, quiet hours
    validation/ zod schemas for settings and IPC payloads
    i18n/       English and Arabic strings
  main/       Electron main process
    app/        composition root, assets protocol, logging
    database/   node:sqlite connection, migrations, repositories
    services/   settings, focus, hydration, prayer
    notifications/  the single scheduler, notification content, native notifier
    windows/    main window, desktop widget, security hardening
    tray/       tray icon and menu
    ipc/        validated IPC handlers
  preload/    narrow, typed `window.daywell` API
  renderer/   React UI (main window and widget entries)
```

Key decisions:

- **The main process owns all state.** Timers, reminders and persistence live there, so everything keeps working with all windows hidden. Renderers only display state slices pushed over IPC and send validated commands.
- **Timers use timestamps, never tick counting.** A running focus phase stores its absolute end time; remaining time is `endsAt − now`. State is persisted on every transition, so suspension, throttling and restarts cannot drift it.
- **One scheduler for every notification.** Features describe upcoming events as data with deterministic ids (for example `prayer:2026-10-14:asr:at`). A single timer wakes for the earliest one (at most once a minute otherwise), and a persistent log of handled ids makes duplicates impossible across re-plans, restarts and resumes.
- **Missed-event policy.** After sleep or downtime, events more than 2 minutes old are recorded as missed and not shown — no flood of stale prayer or water alerts. The one exception: a focus session that ended while you were away is announced once. A long sleep never chains several Pomodoro sessions in the past.
- **Prayer times use the configured timezone's calendar date**, not the computer's, so a location in another timezone (or a DST change) gets the correct day. Times that cannot be calculated (e.g. polar summer) are shown as unavailable, never invented.
- **SQLite via Electron's built-in `node:sqlite`.** No native module to rebuild or package. Migrations run in transactions after a full backup; a failed migration leaves the data untouched and the app explains where the backup is.
- **Security.** Context isolation, sandboxed renderers, no Node integration, a strict Content-Security-Policy, navigation and new windows blocked, permission requests denied, IPC payloads validated with zod and accepted only from the app's own pages. User-chosen files are copied into the data folder and served through a restricted `daywell-asset:` protocol.

## Testing

`npm test` runs 91 unit tests covering clock formatting, the Pomodoro state machine (transitions, pause/resume, reset, long breaks, suspension and restart recovery), hydration totals, progress and local-date boundaries, reminder timing and quiet hours, prayer calculation, the scheduler (duplicates, settings changes, missed events, resume from sleep), database migrations and restart persistence, and notification content.

Prayer calculations are verified against an independent solar-position model: at each calculated time the sun must be at the altitude the method defines (for example −19.5° at Fajr for the Egyptian method, a shadow ratio of 1 or 2 at Asr), within the tolerance of one-minute rounding. Further tests cover method and madhab changes, manual adjustments, next-prayer and midnight rollover, a configured timezone that differs from the system's, and DST transitions in New York and Egypt.

See [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md) for the Windows 10/11 manual checklist.

## Known limitations

- **Transparent windows can't be resized natively on Windows**, so the widget has its own resize grip in the bottom-right corner, shown on hover.
- **Notifications** depend on Windows settings: Focus Assist / Do Not Disturb can hide them. Toasts are attributed to the app through the Start Menu shortcut the installer creates; running the unpacked build without installing may fall back to tray balloons.
- **No notifications while the computer is asleep.** On wake, Daywell reconciles timers and schedules the next relevant event (see the missed-event policy above).
- **System timezone changes while Daywell is running** are detected for display, but the main process may keep using the old offset for focus/hydration dates until it restarts. Prayer times always use their explicitly configured timezone.
- **Quiet hours** are evaluated in the computer's local time.
- **Launch at startup** only applies to the installed app, not to `npm run dev`.
- **The widget is not keyboard-focusable** by design (it must never steal focus). Control it from the tray or Settings → Clock → Desktop widget.
- **Arabic** covers the main interface; less common strings fall back to English.
- `node:sqlite` is still flagged experimental by Node.js, although its API has been stable across Node 22–24.
- Prayer times may differ by a few minutes from local mosque timetables, which sometimes apply their own adjustments. Use the per-prayer adjustments to match them.
