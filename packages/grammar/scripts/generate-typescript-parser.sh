#!/bin/bash
set -e

GRAMMAR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GRAMMAR_FILE="$GRAMMAR_DIR/../src/TTR.g4"
OUTPUT_DIR="$GRAMMAR_DIR/../../parser/src/generated"

if [ ! -f "$GRAMMAR_FILE" ]; then
  echo "Grammar file not found: $GRAMMAR_FILE"
  exit 1
fi

if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Output directory not found: $OUTPUT_DIR"
  echo "Run this script from @modeler/parser after installing antlr4ng-cli"
  exit 1
fi

cd "$GRAMMAR_DIR/.."
npx antlr4ng-cli -Xexact-match -Dlanguage=TypeScript -o "$OUTPUT_DIR" -Xmnemonics=false "$GRAMMAR_FILE"
echo "Parser generated to $OUTPUT_DIR"