#!/bin/bash

mkdir -p icons
for mode in light dark; do
  for kind in pdf snapshot epub; do
    #rsvg-convert -h 32 ../better-bibtex/submodules/zotero/chrome/skin/default/zotero/item-type/28/$mode/attachment-$kind.svg > $kind-$mode.png
    cp ../better-bibtex/submodules/zotero/chrome/skin/default/zotero/item-type/28/$mode/attachment-$kind.svg icons/$kind-$mode.svg
  done
done
