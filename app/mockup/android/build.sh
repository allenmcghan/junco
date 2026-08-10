#!/usr/bin/env bash
# Build the Junco PFD layout mockup APK.
#
# Deliberately built with the raw SDK tools rather than Gradle. There is one
# activity, no dependencies, and no library resolution to do, so the Android
# Gradle Plugin would add a large download and a version-matrix problem to a
# build that is otherwise six commands. A real client would use Gradle; this is
# not a real client.
#
# Requires: ANDROID_HOME pointing at an SDK with build-tools and platform 34,
# and a JDK. Produces build/junco-pfd-mockup.apk, debug-signed for sideloading.
#
# SPDX-License-Identifier: GPL-2.0-or-later

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB="$(cd "$HERE/.." && pwd)"
OUT="$HERE/build"

: "${ANDROID_HOME:?set ANDROID_HOME to your Android SDK}"

# build-tools 35 or newer. The d8 shipped in build-tools 34.0.0 predates JDK 21
# and dies while writing the dex with an opaque "Cannot invoke String.length()"
# NPE on every class. If you hit that, this is why: use a newer build-tools or
# an older JDK.
BT=""
for v in $(ls "$ANDROID_HOME/build-tools" 2>/dev/null | sort -Vr); do
  case "$v" in
    3[5-9].*|[4-9][0-9].*) BT="$ANDROID_HOME/build-tools/$v"; break ;;
  esac
done
[ -n "$BT" ] || { echo "need build-tools 35.0.0 or newer" >&2; exit 1; }

JAR="$ANDROID_HOME/platforms/android-34/android.jar"
[ -f "$JAR" ] || { echo "missing platform android-34" >&2; exit 1; }
echo "==> using $(basename "$BT") build-tools, JDK $(java -version 2>&1 | head -1 | sed 's/.*"\(.*\)".*/\1/')"

rm -rf "$OUT"
mkdir -p "$OUT/assets" "$OUT/flat" "$OUT/gen" "$OUT/classes"

# The web app is the payload. Copy it in rather than symlink so the APK is
# self-contained and the source of truth stays one directory up.
cp "$WEB/index.html" "$WEB/profile.js" "$WEB/net.js" "$WEB/ops.js" "$WEB/tiles.js" "$WEB/manifest.webmanifest" "$WEB/sw.js" \
   "$WEB/icon-192.png" "$WEB/icon-512.png" "$OUT/assets/"

echo "==> resources"
"$BT/aapt2" compile --dir "$HERE/res" -o "$OUT/flat/res.zip"

echo "==> link"
"$BT/aapt2" link \
  -o "$OUT/base.apk" \
  -I "$JAR" \
  --manifest "$HERE/AndroidManifest.xml" \
  -R "$OUT/flat/res.zip" \
  -A "$OUT/assets" \
  --java "$OUT/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 34 \
  --auto-add-overlay

echo "==> javac"
# Pass file lists as arguments rather than via @argfile: a trailing newline in
# an argfile arrives as an empty argument and d8 dies on it with an opaque NPE.
javac -nowarn -source 17 -target 17 -encoding UTF-8 \
  -classpath "$JAR" -d "$OUT/classes" \
  $(find "$HERE/src" "$OUT/gen" -name '*.java') 2>&1 | grep -v 'bootstrap class path' || true

echo "==> dex"
mkdir -p "$OUT/dex"
"$BT/d8" --lib "$JAR" --min-api 24 --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')
cp "$OUT/dex/classes.dex" "$OUT/classes.dex"

echo "==> package"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
( cd "$OUT" && zip -q -j unsigned.apk classes.dex )

echo "==> align"
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "==> sign"
KS="$HERE/debug.keystore"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -v -keystore "$KS" -storepass android -keypass android \
    -alias juncodebug -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Junco Mockup Debug, OU=Junco, O=Junco, C=US" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \
  --out "$OUT/junco-pfd-mockup.apk" "$OUT/aligned.apk"

"$BT/apksigner" verify --print-certs "$OUT/junco-pfd-mockup.apk" | head -3

echo
echo "built: $OUT/junco-pfd-mockup.apk"
ls -lh "$OUT/junco-pfd-mockup.apk" | awk '{print $5, $9}'
