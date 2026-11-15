#!/usr/bin/env bash
# packages the extension into a zip for the chrome web store
set -euo pipefail
cd "$(dirname "$0")"
version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
mkdir -p dist
out="dist/neetcode-leetcode-checker-$version.zip"
rm -f "$out"
zip -q -r "$out" manifest.json popup.html popup.js icons
echo "$out"
