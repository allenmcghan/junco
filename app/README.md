# Android reference client

Nothing here yet.

Android native, open source, distributed as an APK on GitHub releases and via F-Droid. No store dependency, no developer account, no expiry.

The network binding is the reason this is native rather than a web app: ConnectivityManager.requestNetwork() with a WifiNetworkSpecifier attaches to the node's access point, and bindSocket() binds only this app's socket to it, so the rest of the tablet keeps using cellular.

iOS is not on the critical path. iOS users get GDL90 into ForeFlight.
