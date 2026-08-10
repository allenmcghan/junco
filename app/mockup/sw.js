/* Junco PFD layout mockup — service worker.
 *
 * The only job here is offline. A flight instrument that stops working when the
 * cell signal drops is not an instrument, and at 800 feet over a field the
 * signal drops routinely. Cache the shell on install, serve it from cache
 * first, and never depend on the network in the air.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

var CACHE = "junco-pfd-v7";
var TILES = "junco-osm-tiles-v1";

var SHELL = [
  "./",
  "./index.html",
  "./profile.js",
  "./net.js",
  "./ops.js",
  "./tiles.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return (k === CACHE || k === TILES) ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") { return; }

  // Basemap tiles live in their own cache and are served cache-first for good.
  // A tile pulled on the ground is the whole reason the map works in the air,
  // so it is never evicted by a shell update.
  if (e.request.url.indexOf("tile.openstreetmap.org") >= 0 ||
      e.request.url.indexOf("tiles.arcgis.com") >= 0) {
    e.respondWith(
      caches.open(TILES).then(function (c) {
        return c.match(e.request).then(function (hit) {
          if (hit) { return hit; }
          return fetch(e.request).then(function (res) {
            if (res && (res.status === 200 || res.type === "opaque")) { c.put(e.request, res.clone()); }
            return res;
          });
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) { return hit; }
      return fetch(e.request).then(function (res) {
        // Cache same-origin successes so a first online run primes everything.
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
