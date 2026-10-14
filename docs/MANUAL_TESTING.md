# Manual testing checklist (Windows 10 and Windows 11)

Run through this on both Windows 10 and Windows 11, using the installed build (`dist/Daywell-Setup-<version>.exe`). For a fresh start, close Daywell from the tray and rename `%APPDATA%\Daywell` first.

## Install and launch

- [ ] Installer runs (accept the SmartScreen warning for the unsigned build) and creates Start Menu and desktop shortcuts.
- [ ] Daywell opens on the Clock page with the correct local time and date.
- [ ] Launching Daywell a second time focuses the existing window instead of opening another.
- [ ] Uninstall, then reinstall: settings and history are still there.

## Clock

- [ ] The time matches the Windows clock, including seconds.
- [ ] Settings → General → Time format switches 12-hour and 24-hour everywhere (clock, widget, prayer times, lists).
- [ ] Each of the five designs (Minimal, Flip, Retro, Neon, Nature) looks clearly different.
- [ ] Flip digits flip once per change, with no continuous motion.
- [ ] Font, text colour, solid background, image background (choose a JPG/PNG), seconds, date and size all apply immediately and survive a restart.
- [ ] With Windows "Animation effects" turned off (Settings → Accessibility → Visual effects), flip and page animations stop.

## Desktop widget

- [ ] The sidebar's "Desktop widget" button, the tray menu and Settings all show and hide the widget.
- [ ] Showing the widget does not take keyboard focus from the app you are typing in.
- [ ] Drag the widget to move it; drag the corner grip (shown on hover) to resize it. Restart Daywell: position and size are restored.
- [ ] Always-on-top on: the widget stays above other windows. Off: other windows can cover it.
- [ ] Opacity slider changes the widget's transparency; the rounded corners show the desktop behind.
- [ ] Turn on click-through: clicks pass to the desktop. Turn it off again from the tray ("Make widget clickable again").
- [ ] The widget's "Open Daywell" button opens the main window; "Hide" hides the widget.
- [ ] Disconnect a second monitor the widget was on, then restart: the widget reappears on the primary screen.

## Focus

- [ ] Start, pause, resume, reset and skip behave as labelled; the ring and countdown are smooth.
- [ ] Set the focus length to 1 minute, start, then hide the window (close it to the tray). A notification appears after one minute and the break is ready.
- [ ] Start a session, put the PC to sleep for longer than the session, then wake it: one "session complete" notification appears, the session counts in today's summary, and no extra sessions were started.
- [ ] Start a session, quit from the tray, reopen Daywell: the countdown continues from the right time.
- [ ] Auto-start on: the break starts by itself when focus ends.
- [ ] The long break comes after the configured number of sessions.
- [ ] Turning sound off silences the chime; turning notifications off suppresses the toast.

## Hydration

- [ ] Quick-add buttons and a custom amount add entries; invalid amounts (0, letters, over 5,000) show an error.
- [ ] Removing an entry updates the total, percentage and ring.
- [ ] Quit and reopen: today's entries and the 7-day history are restored.
- [ ] Set the reminder interval to 15 minutes: a reminder arrives about 15 minutes after the last drink. Clicking it opens the Hydration page.
- [ ] "Pause 1 h" and "Pause until tomorrow" stop reminders; "Resume reminders" restarts them.
- [ ] No reminders arrive during quiet hours; none arrive after the daily goal is reached.
- [ ] Just after midnight, the day's total resets to 0 and yesterday appears in the history.

## Prayer times

- [ ] The default location is Alexandria, Egypt; the times are close to a published local timetable (within a few minutes).
- [ ] Changing the calculation method (e.g. Egyptian → Muslim World League) visibly changes Fajr and Isha.
- [ ] Switching Asr to Hanafi makes Asr later; other prayers are unchanged.
- [ ] A +5 minute adjustment on one prayer moves only that prayer by exactly 5 minutes.
- [ ] Choosing another city updates the location, timezone and times; "Use it" applies the suggested method.
- [ ] A custom location (latitude/longitude) with a different timezone shows times for that place's date.
- [ ] The next prayer is highlighted and the countdown reaches zero at the prayer time, then moves to the following prayer. After Isha it shows tomorrow's Fajr.
- [ ] A notification appears at prayer time and, if enabled, the configured minutes before. Disabled prayers do not notify.
- [ ] Sleep across several prayer times, then wake: no burst of old prayer notifications.
- [ ] A far-north city in summer (custom 69.6, 18.9, Europe/Oslo) shows unavailable times with an explanation rather than wrong values.
- [ ] The Athan never plays unless enabled with a chosen audio file; when enabled, it plays at prayer time.

## Tray and background

- [ ] Closing the window hides it to the tray (a one-time hint explains this); reminders keep working.
- [ ] The tray menu opens the app, toggles the widget, starts/pauses focus, logs water, shows the next prayer and exits.
- [ ] With "Keep running in the tray" off, closing the window quits Daywell.
- [ ] Launch at startup on: sign out and in, and Daywell starts hidden in the tray. Off: it does not start.
- [ ] With all windows hidden, Task Manager shows Daywell near 0% CPU.

## Settings, theme and language

- [ ] Every setting survives a restart.
- [ ] Appearance System/Light/Dark switches the app, widget and title bar; System follows Windows.
- [ ] Arabic switches the layout to right-to-left; times such as "7:48 PM" still read correctly.
- [ ] All controls can be reached and operated with Tab, Space/Enter and arrow keys (settings tabs), with a visible focus ring.

## Offline

- [ ] Disconnect from the network and restart: every feature, including prayer times, works.
