import { describe, it, expect } from 'vitest';
import { buildLayout, applyPositions, type CyShim } from '../save-layout';

describe('layout-round-trip', () => {
  describe('buildLayout', () => {
    it('preserves inactive schema viewport (F-1 regression)', () => {
      const viewports = {
        db: { zoom: 2.0, panX: 100, panY: 200, displayMode: 'with-types' as const },
        er: { zoom: 1.0, panX: 0, panY: 0, displayMode: 'just-names' as const },
      };
      const mockCy: CyShim = {
        nodes: () => [],
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 3.0,
      };

      const result = buildLayout(mockCy, viewports, 'er', 'just-names');

      expect(result.viewports.db.zoom).toBe(2.0);
      expect(result.viewports.db.panX).toBe(100);
      expect(result.viewports.db.panY).toBe(200);
      expect(result.viewports.db.displayMode).toBe('with-types');
      expect(result.viewports.er.zoom).toBe(3.0);
      expect(result.viewports.er.displayMode).toBe('just-names');
    });

    it('includes current displayMode for active schema (F-2 regression)', () => {
      const viewports = {
        db: { zoom: 1, panX: 0, panY: 0, displayMode: 'with-types' as const },
        er: { zoom: 1, panX: 0, panY: 0, displayMode: 'just-names' as const },
      };
      const mockCy: CyShim = {
        nodes: () => [],
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1,
      };

      const result = buildLayout(mockCy, viewports, 'db', 'with-constraints');

      expect(result.viewports.db.displayMode).toBe('with-constraints');
      expect(result.viewports.er.displayMode).toBe('just-names');
    });

    it('maps every cy node qname to its position', () => {
      const viewports = {
        db: { zoom: 1, panX: 0, panY: 0, displayMode: 'with-types' as const },
        er: { zoom: 1, panX: 0, panY: 0, displayMode: 'just-names' as const },
      };
      const mockNode1 = { position: () => ({ x: 10, y: 20 }), data: (_k: string) => 'er.entity.artikl' };
      const mockNode2 = { position: () => ({ x: 30, y: 40 }), data: (_k: string) => 'er.entity.other' };
      const mockCy: CyShim = {
        nodes: () => [mockNode1 as unknown as ReturnType<CyShim['nodes']>[0], mockNode2 as unknown as ReturnType<CyShim['nodes']>[0]],
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1,
      };

      const result = buildLayout(mockCy, viewports, 'er', 'just-names');

      expect(result.nodes['er.entity.artikl']).toEqual({ x: 10, y: 20 });
      expect(result.nodes['er.entity.other']).toEqual({ x: 30, y: 40 });
    });
  });

  describe('applyPositions', () => {
    it('ignores unknown qnames (F-6 regression)', () => {
      const positionCalls: Array<{ qname: string; pos: { x: number; y: number } }> = [];
      const mockCy = {
        getElementById: (qname: string) => {
          if (qname === 'er.entity.ghost') return { length: 0 };
          return {
            length: 1,
            position: (pos: { x: number; y: number }) => {
              positionCalls.push({ qname, pos });
            },
          };
        },
      };

      applyPositions(mockCy as unknown as Parameters<typeof applyPositions>[0], {
        'er.entity.artikl': { x: 42, y: 99 },
        'er.entity.ghost': { x: 0, y: 0 },
      });

      expect(positionCalls).toHaveLength(1);
      expect(positionCalls[0].qname).toBe('er.entity.artikl');
      expect(positionCalls[0].pos).toEqual({ x: 42, y: 99 });
    });
  });
});