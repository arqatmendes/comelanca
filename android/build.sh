#!/bin/bash
# Gera o Comelança.apk sem Gradle (aapt2 + javac + dx + apksigner)
set -euo pipefail
cd "$(dirname "$0")"
SDK=/usr/lib/android-sdk; BT=$SDK/build-tools/debian; JAR=$SDK/platforms/android-23/android.jar
VERSION_CODE=${VERSION_CODE:-1}; VERSION_NAME=${VERSION_NAME:-1.0}
rm -rf build && mkdir -p build/{res,gen,obj,dex,apk/assets}
cp -r ../www build/apk/assets/www
$BT/aapt2 compile --dir res -o build/res/res.zip
$BT/aapt2 link -I $JAR --manifest AndroidManifest.xml --min-sdk-version 23 --target-sdk-version 34 \
  --version-code $VERSION_CODE --version-name $VERSION_NAME --replace-version -A build/apk/assets \
  --java build/gen -o build/unsigned.apk build/res/res.zip
javac -nowarn -source 8 -target 8 -bootclasspath $JAR -cp $JAR -d build/obj $(find src build/gen -name '*.java') 2>&1 | grep -v "bootstrap\|warning" || true
$BT/dx --dex --min-sdk-version=23 --output=build/dex/classes.dex build/obj
(cd build/dex && zip -q ../unsigned.apk classes.dex)
$BT/zipalign -f -p 4 build/unsigned.apk build/aligned.apk
[ -f comelanca.keystore ] || keytool -genkeypair -keystore comelanca.keystore -storepass comelanca -keypass comelanca \
  -alias comelanca -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Comelanca, O=Familia, C=BR" >/dev/null 2>&1
$BT/apksigner sign --ks comelanca.keystore --ks-pass pass:comelanca --key-pass pass:comelanca --out ../Comelanca.apk build/aligned.apk
$BT/apksigner verify --print-certs ../Comelanca.apk | head -2
ls -la ../Comelanca.apk
