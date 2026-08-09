# PFD layout mockup

A primary flight display laid out the way pilots already read one: attitude in
the centre, airspeed tape left, altitude tape right, VSI, HSI below, engine
strip down the edge.

**This is not the client and is not on the path to being it.** It exists to
answer layout questions before anyone writes an APK, because a tape range or a
band order is cheap to change here and expensive once there is an app.

## What it is for

Three questions it was built to answer:

1. **Does design rule 8 survive a real layout?** Twenty small source tags read as
   noise. The answer this mockup proposes is the one real avionics already use:
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

## What is real and what is invented

**Real, from the device:** attitude, heading, track, ground speed, GPS altitude,
position.

**Simulated:** the entire engine strip, indicated airspeed, pressure altitude,
and vertical speed. Those are node channels and no node exists. Values are
plausible PM-2 cruise numbers.

**Impossible:** pressure altitude and vertical speed can never come from the
phone, because there is no web API for ambient pressure. PRD section 6 reaches
the same conclusion from a different direction, and this is one more reason the
plumbed plenum is not optional.

## Why this is a web page when the client will be native

A PWA is the right shape for a prototype and the wrong shape for the instrument.
It installs in seconds, needs no store account, no signing key, and no build
toolchain, so a layout question gets answered the same afternoon it is asked.

What it cannot do is hold a BLE link for a two hour flight. Web Bluetooth exists
on Android and would genuinely reach the node, but it needs a user gesture per
connection, has no background operation, and drops when the page is suspended.
It does not exist on iOS at all. See PRD section 19.

Nothing in this directory should end up in the shipping client. Only the layout
decisions should.
