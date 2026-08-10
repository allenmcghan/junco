# Publishing Junco to Google Play

What is done, what you must do, and the two decisions that are permanent.

## Permanent once you publish

**Package name: `com.keylinkit.junco`.** I picked `keylinkit.com` because it is a
domain you demonstrably control, which is the convention. **Change it now if you
want something else** — after the first upload it can never change, and shipping
under a domain you do not own is the mistake that cannot be undone. It appears in
`android/build.gradle`, `AndroidManifest.xml`, the Java package path, and
`build.sh`.

**Your upload key.** Generate it once and never lose it:

```
keytool -genkeypair -v -keystore junco-upload.jks -storetype PKCS12 \
  -keyalg RSA -keysize 4096 -validity 10000 -alias upload
```

Keep it out of the repository — `.gitignore` already excludes `*.keystore` and
`*.jks`. Back it up somewhere you will still have in ten years. Enrol in **Play
App Signing** when you first upload: Google then holds the app signing key and
your upload key can be reset if lost. Without it, a lost key means you can never
update the app and must publish a new listing.

## Build the bundle

Play requires an Android App Bundle, not an APK, so releases go through Gradle.
`android/build.sh` stays for local iteration and still produces a debug APK in
about ten seconds.

```
export JUNCO_KEYSTORE=/secure/path/junco-upload.jks
export JUNCO_KEYSTORE_PASSWORD=...
export JUNCO_KEY_ALIAS=upload
export JUNCO_KEY_PASSWORD=...
export JUNCO_VERSION_CODE=1
export JUNCO_VERSION_NAME=0.1.0
cd app/junco/android && gradle bundleRelease
```

Output: `android/build/outputs/bundle/release/android-release.aab`.

`versionCode` must increase on every upload and can never be reused.

## Done already

- Target SDK 35, min SDK 24
- No ads, no analytics, no tracking, no network beyond charts, weather, and traffic
- Location used in the foreground only, never in the background, which avoids the
  most onerous Play location review
- First-run safety acknowledgement shown before use
- No account, no login, nothing uploaded
- Offline by design; the airport database and cached charts work with no signal

## What you must supply

**Privacy policy at a public URL.** Required for any app requesting location.
Yours is unusually easy to write because it is nearly all "no": position, flight
logs, aircraft profiles and checklists stay on the device; nothing is collected,
transmitted, or shared; chart, weather and traffic requests go directly to
OpenStreetMap, aviationweather.gov and airplanes.live, which see an IP address as
any web request does.

**Data safety form.** Declare *Location — approximate and precise*, used for App
functionality, **not collected** (it never leaves the device). Answer no to data
sharing and no to data collection everywhere else. Getting this wrong is the most
common cause of a rejected aviation app.

**Store listing.**

| Asset | Requirement |
|---|---|
| App icon | 512×512 PNG, 32-bit |
| Feature graphic | 1024×500 PNG or JPEG |
| Phone screenshots | 2–8, at least 1080 px on the short side |
| 7" and 10" tablet screenshots | Recommended; you have a Fold, so use it |
| Short description | 80 characters |
| Full description | 4000 characters |

`icon-512.png` in this directory is a starting point but is a flat generated
image; a real listing icon deserves better.

**Content rating questionnaire** and **target audience** — not for children.

## Say the limits in the listing, not just in the app

Play reviews apps that could affect safety, and an aviation instrument is one.
Do not oversell. The description should state plainly that it is **advisory
only, not a certified aviation product, not for navigation**, that charts and
airport data may be out of date, and that traffic is incomplete. The first-run
screen already says all of this; the listing should agree with it. A listing that
promises more than the app should deliver is both a rejection risk and a
liability problem.

## Two things worth thinking about before you press publish

**Liability.** This is a flight instrument for aircraft with no panel, and
someone will eventually rely on it more than they should. A disclaimer helps and
does not make the question disappear. Worth an hour with someone who knows
aviation product liability before it is public, not after.

**GPL and Play.** The code is GPL-2.0-or-later, and Play's terms grant Google
distribution rights that sit awkwardly with GPL redistribution terms. As sole
copyright holder you can distribute your own work under any terms you like, so
this is fine today. It stops being simple the moment you merge someone else's
contribution — at that point you need either a contributor licence agreement or
a decision to distribute only through F-Droid, which is built for GPL apps and
where much of this audience already looks.

## Also worth doing before real users arrive

- Rework the `mockup` framing out of `docs/prd.md`; the PRD still calls this a
  layout study that is not the client, and it is now neither
- A crash reporter that does not phone home, or a plain "copy diagnostics" button
- Test on a genuinely small screen; the layout is built for landscape tablets and
  large phones
- Decide what happens when the airport database goes stale, since it is bundled
  and only updates when the app does
