#!/bin/bash

for kind in pdf snapshot epub; do
  rsvg-convert -h 32 ../better-bibtex/submodules/zotero/chrome/skin/default/zotero/item-type/28/light/attachment-$kind.svg > $kind.png
done
