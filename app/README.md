# Android reference client

Nothing here yet.

Android native, open source, distributed as an APK on GitHub releases and via F-Droid. No store dependency, no developer account, no expiry.

The app is half the instrument system, not a display for the other half. It supplies position, attitude, and time from the phone's own sensors while the node supplies engine, fuel, and air data over BLE. Neither is a complete picture alone.

Native rather than a web app, for two reasons in order of weight: a PWA cannot reach BLE on iOS at all, and it cannot bind a socket to a specific network. The second still matters for the on-demand Wi-Fi AP used for log pull, config, and firmware, where ConnectivityManager.requestNetwork() with a WifiNetworkSpecifier plus bindSocket() keeps the rest of the tablet on cellular. That AP is never used in flight.

iOS is not on the critical path for v1, but the protocol is deliberately reachable from it: BLE is available to third-party iOS apps, which is why the link is BLE rather than Bluetooth Classic SPP. There is no GDL90 output in v1, so an iOS user gets nothing from Junco until someone writes that client.

Traffic display, if anyone builds it, is an app-side channel that never involves the node. See docs/prd.md section 22.

`mockup/` holds a PFD layout prototype as an installable web app. It is not the client and is not on the path to being it — it exists to settle layout questions before anyone writes an APK, because a tape range is cheap to change there and expensive here. See its README for what it answers and how to serve it.

This app is the reference client and the only one required in v1, but it is no longer the only client. A build with a panel and a Pi can reach pyEFIS through a FIX-Gateway plugin instead. See docs/prd.md section 24. The primary aircraft has no panel, which is why the phone comes first.
