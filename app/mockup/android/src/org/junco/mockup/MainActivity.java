/*
 * Junco PFD layout mockup — Android wrapper.
 *
 * This is deliberately thin. It exists for one reason: device orientation and
 * geolocation are only available to a *secure context*, so loading the mockup
 * from file:// would silently kill exactly the sensors this app is for. The
 * WebView therefore serves the bundled assets over a real https:// origin and
 * intercepts those requests locally. Nothing leaves the device and no network
 * is used.
 *
 * This is not the Junco client and is not on the path to being it. See
 * ../README.md and PRD section 19.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

package org.junco.mockup;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    /** Any host works; it just has to be https so the page is a secure context. */
    private static final String ORIGIN = "https://appassets.junco.local";
    private static final String START = ORIGIN + "/index.html";

    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                // Keep everything inside the bundled origin. There is nowhere else to go.
                return !ORIGIN.equals(req.getUrl().getScheme() + "://" + req.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                                                           GeolocationPermissions.Callback cb) {
                // The Android-level permission prompt below is the real gate.
                cb.invoke(origin, true, false);
            }
        });

        immersive();
        requestLocation();

        web.loadUrl(START);
    }

    /** Serve a bundled asset for a request against our synthetic https origin. */
    private WebResourceResponse serve(Uri uri) {
        if (uri == null || !"https".equals(uri.getScheme())) { return null; }
        if (!Uri.parse(ORIGIN).getHost().equals(uri.getHost())) { return null; }

        String path = uri.getPath();
        if (path == null || path.equals("/")) { path = "/index.html"; }
        String asset = path.startsWith("/") ? path.substring(1) : path;

        // No traversal out of assets/.
        if (asset.contains("..")) { return null; }

        try {
            InputStream in = getAssets().open(asset);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime(asset), "utf-8", 200, "OK", headers, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                    new HashMap<String, String>(), null);
        }
    }

    private static String mime(String name) {
        if (name.endsWith(".html")) { return "text/html"; }
        if (name.endsWith(".js")) { return "text/javascript"; }
        if (name.endsWith(".css")) { return "text/css"; }
        if (name.endsWith(".png")) { return "image/png"; }
        if (name.endsWith(".webmanifest") || name.endsWith(".json")) { return "application/manifest+json"; }
        return "application/octet-stream";
    }

    private void requestLocation() {
        if (Build.VERSION.SDK_INT >= 23
                && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                   != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION }, 1);
        }
    }

    private void immersive() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) { immersive(); }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) { web.goBack(); } else { super.onBackPressed(); }
    }
}
