// Glyphs for Crow's-foot cardinality notation.
// All glyphs use a 16px fan length: the fan spans y=0 (origin/edge center) to y=-16 (tip).
// The one-or-many combines a perpendicular tick (from -16 to -22) with a 16px crow's foot.

import type { Cardinality } from '@modeler/lsp';

export function glyphFor(card: Cardinality | null): string {
  switch (card) {
    case 'one':
      return `<g class="glyph-one"><line x1="0" y1="-16" x2="0" y2="-22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>`;
    case 'zero-or-one':
      return `<g class="glyph-zero-or-one"><line x1="0" y1="-16" x2="0" y2="-22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="-22" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/></g>`;
    case 'many':
      return `<g class="glyph-many"><line x1="0" y1="0" x2="-7" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="0" x2="7" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>`;
    case 'one-or-many':
      return `<g class="glyph-one-or-many"><line x1="0" y1="-16" x2="0" y2="-22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="0" x2="-7" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="0" x2="7" y2="-16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>`;
    case null:
      return '';
  }
}