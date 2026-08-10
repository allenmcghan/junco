# Junco — Android electronic flight bag

An electronic flight bag for ultralight and experimental aircraft, useful today
with no hardware at all. Primary flight display from the phone's own sensors,
FAA sectional and terminal charts, direct-to navigation, 25,000 bundled US
airports with frequencies, per-aircraft checklists, an automatic logbook,
weather, and advisory traffic. Offline by design.

**It started as a layout study for hardware that did not exist**, and outgrew
that. See `RELEASE.md` for the path to Google Play and PRD section 25 for how
each design rule shows up in it.

## Questions it was built to answer, and did

1. **Does design rule 8 survive a real layout?** Twenty small source tags read as
   noise. The answer this app proposes is the one real avionics already use:
   annunciate the source on the instrument. `PHONE AHRS · ADVISORY` on the
   attitude indicator, cyan for node-plumbed channels, magenta for GPS-derived.
2. **Is phone attitude worth showing at all?** PRD section 15 lists this as open.
   The attitude here is low-pass filtered because raw phone fusion is too jittery
   to look at sitting still on a desk, which is an early data point and not an
   encouraging one.
3. **Does an HSI earn its space** on an aircraft that mostly flies straight?

## Running it

It works with no sensors at all. On load it flies a scripted circuit, and
dragging anywhere on the display flies it by hand. That is enough to judge
layout, and arguably better than real sensors, because it holds sustained bank
angles you would not produce waving a phone around.

For **real** attitude the page has to be a top-level HTTPS document. Device
orientation is gated by Permissions Policy, so in a cross-origin iframe it never
fires, and a page cannot grant itself the permission.

| Where | What you get |
|---|---|
| Opened inside any iframe | Demo flight only. The diagnostics panel says why |
| Desktop Chrome, top level | DevTools → More tools → Sensors drives it |
| Phone over HTTPS, top level | Real attitude, heading, track, ground speed, position |
| Installed to the home screen | The above, plus fullscreen, landscape lock, screen wake lock, and offline |

The simplest way to get the last row: publish this directory with GitHub Pages
and open it on the phone, then use the browser's *Add to Home Screen*. The
service worker caches the shell on first load, so it runs afterwards with no
signal.

## As an Android app

`android/` wraps these files in an APK. It exists for one reason: device
orientation and geolocation are only available to a **secure context**, so a
WebView loading `file://` would silently kill exactly the sensors the app is
for. The wrapper serves the bundled assets over an `https://` origin and
intercepts those requests locally. Nothing leaves the device and no network is
used.

Build it with `android/build.sh`, which needs `ANDROID_HOME` and build-tools 35
or newer. It uses the raw SDK tools rather than Gradle, because one activity
with no dependencies does not need a plugin and a version matrix.

**The APK is not committed.** `.gitignore` excludes `*.apk` deliberately, so the
`App APK` workflow builds it instead: every run uploads it as an artifact,
and pushing a `v*` tag attaches it to a release.

It is debug-signed, so installing it means allowing unknown sources. That is
appropriate for a app and would not be appropriate for anything else.

## Weight and balance

`W&B` on the tab bar. It ships **off**, with no numbers, and stays that way until
you enter values from an actual weighing.

That is deliberate and it is the only field in the whole app that works this way.
Every other preset value is a plausible starting point you correct later; an
empty weight is not. There is no plausible empty weight for an aircraft nobody
has weighed, and a fabricated one that happens to close the envelope is worse
than a blank page, because it looks like an answer.

Enter empty weight and arm, max gross, the CG envelope, and a station for each
seat and baggage area, all measured aft of whatever datum your weighing report
used. Loads persist per aircraft, so the pilot's own weight is typed once.

The **Part 103 check** underneath it tests 14 CFR 103.1 against what the app can
actually see, and says so where it cannot: two of the four numeric limits are
calibrated airspeeds no phone can measure, and the 254 lb empty weight limit
excludes floats and safety devices intended for deployment in a potentially
catastrophic situation, so a ballistic parachute has to come out of the number
before you type it. **Arithmetic aid, not a finding of compliance.**

Fuel on board is entered here too. It drives endurance, time to reserve, and
fuel remaining at the destination on the main screen. It is a number you typed,
not a measurement, and every readout of it shows how long ago you typed it.

## What is real and what is invented

**Real, from the device:** attitude, heading, track, ground speed, GPS altitude,
position.

**Real, but from you:** empty weight, station arms, loads, and fuel on board.
Marked as entered rather than measured wherever they are used.

**Simulated:** the entire engine strip, indicated airspeed, pressure altitude,
and vertical speed. Those are node channels and no node exists. Values are
plausible PM-2 cruise numbers.

**Impossible:** pressure altitude and vertical speed can never come from the
phone, because there is no web API for ambient pressure. PRD section 6 reaches
the same conclusion from a different direction, and this is one more reason the
plumbed plenum is not optional.

## Why a WebView, and where that stops working

A web payload in a thin native wrapper builds in seconds, runs identically in a
browser for development, and needs no toolchain to change a tape range. For
everything the app does today, that is the right trade.

It stops working at the node. Web Bluetooth reaches a peripheral on Android, but
it needs a user gesture per connection, has no background operation, and drops
when the page is suspended, so it cannot hold a link for a two hour flight. When
the node exists, the BLE client belongs in the native layer and the WebView keeps
the display. See PRD section 19.

`build.sh` is the ten-second debug loop. `android/build.gradle` produces the
signed App Bundle that Google Play requires. Both build the same web payload.
