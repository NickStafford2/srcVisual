#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p units
for file in 01_sources.cpp 02_targets.cpp 03_local.cpp; do
    srcdiff --position --filename "$file" "before/$file" "after/$file" -o "units/$file.xml"
done
srcml --archive --url synthetic-multi-endpoint \
    --xmlns:pos=http://www.srcML.org/srcML/position \
    --xmlns:diff=http://www.srcML.org/srcDiff \
    units/01_sources.cpp.xml units/02_targets.cpp.xml units/03_local.cpp.xml \
    -o ../synthetic_2x3_cross_file.srcdiff.xml
srcMove ../synthetic_2x3_cross_file.srcdiff.xml \
    ../synthetic_2x3_cross_file.srcmove.xml --results results.json --diagnostics
