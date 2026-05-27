import { describe, it, expect } from 'vitest';
import { parseString } from '../index.js';

describe('inline mappings — entity level', () => {
  it('parses entity with full inline mapping + columns map', () => {
    const result = parseString(`
      schema er
      def entity artikl {
        mapping: {
          target: { table: db.dbo.QZBOZI_DF },
          columns: {
            id_artiklu: IDZBOZI,
            kód_artiklu: { target: KOD_ZBOZI },
            název_artiklu: { target: { column: NAZEV_ZBOZI } }
          }
        },
        attributes: [
          def attribute id_artiklu { type: int, isKey: true },
          def attribute kód_artiklu { type: text },
          def attribute název_artiklu { type: text }
        ]
      }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
    const entity = result.ast!.definitions[0] as any;
    expect(entity.kind).toBe('entity');
    expect(entity.mapping).toBeDefined();
    expect(entity.mapping.kind).toBe('block');
    expect(entity.mapping.target).toBeDefined();
    expect(entity.mapping.columns).toHaveLength(3);
    expect(entity.mapping.columns[0].name).toBe('id_artiklu');
    expect(entity.mapping.columns[0].value.kind).toBe('bareId');
  });
});

describe('inline mappings — attribute level', () => {
  it('parses attribute with bare-id mapping', () => {
    const result = parseString(`
      schema er
      def attribute id_produktu { type: int, mapping: IDSKUPZBOZI }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
    const attr = result.ast!.definitions[0] as any;
    expect(attr.mapping).toBeDefined();
    expect(attr.mapping.kind).toBe('bareId');
    expect(attr.mapping.id.path).toBe('IDSKUPZBOZI');
  });

  it('parses attribute with full mapping block', () => {
    const result = parseString(`
      schema er
      def attribute název_artiklu {
        type: text,
        mapping: { target: { column: NAZEV_ZBOZI } }
      }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
    const attr = result.ast!.definitions[0] as any;
    expect(attr.mapping.kind).toBe('block');
    expect(attr.mapping.target).toBeDefined();
  });
});

describe('inline mappings — relation level', () => {
  it('parses relation with bare-fk mapping', () => {
    const result = parseString(`
      schema er
      def entity a {}
      def entity b {}
      def relation r {
        from: er.entity.a, to: er.entity.b,
        cardinality: { from: "0..*", to: "1" },
        join: [{ from: er.entity.a.x, to: er.entity.b.x }],
        mapping: db.dbo.fk_a_b
      }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
    const rel = result.ast!.definitions[2] as any;
    expect(rel.mapping.kind).toBe('bareId');
    expect(rel.mapping.id.path).toBe('db.dbo.fk_a_b');
  });

  it('parses relation with fk block', () => {
    const result = parseString(`
      schema er
      def entity a {}
      def entity b {}
      def relation r {
        from: er.entity.a, to: er.entity.b,
        cardinality: { from: "0..*", to: "1" },
        join: [{ from: er.entity.a.x, to: er.entity.b.x }],
        mapping: { fk: db.dbo.fk_a_b }
      }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
    const rel = result.ast!.definitions[2] as any;
    expect(rel.mapping.kind).toBe('block');
    expect(rel.mapping.fk).toBeDefined();
  });
});

describe('targetProperty bare-id relaxation', () => {
  it('accepts bare id in target on explicit er2db_attribute', () => {
    const result = parseString(`
      schema map
      def er2db_attribute foo { attribute: er.entity.a.b, target: SOMECOL }
    `);
    expect(result.errors, `parse errors: ${result.errors.map(e => e.message).join(', ')}`).toEqual([]);
  });
});

describe('source locations', () => {
  it('mapping source location points at the value, not the keyword', () => {
    const result = parseString(`schema er
  def attribute id { type: int, mapping: IDX }`);
    expect(result.errors).toEqual([]);
    const attr = result.ast!.definitions[0] as any;
    // Source location should cover the value span
    expect(attr.mapping.source.line).toBe(2);
    const fileText = `schema er\n  def attribute id { type: int, mapping: IDX }`;
    const offset = attr.mapping.source.offsetStart;
    expect(fileText.slice(offset, offset + 3)).toBe('IDX');
  });
});