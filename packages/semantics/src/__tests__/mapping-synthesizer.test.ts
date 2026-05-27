import { describe, it, expect } from 'vitest';
import { parseString } from '@modeler/parser';
import { ProjectSymbolTable } from '../project-symbols.js';
import { synthesizeMappings } from '../mapping-synthesizer.js';

function setup(ttr: string, uri = 'file:///t/er.ttr') {
  const parsed = parseString(ttr);
  if (parsed.errors.length) throw new Error(`parse errors: ${JSON.stringify(parsed.errors)}`);
  const symbols = new ProjectSymbolTable();
  symbols.upsertDocument(uri, parsed.ast!, 'er', 'entity', parsed.ast!.packageDecl?.name ?? '');
  synthesizeMappings(symbols, uri, parsed.ast!);
  return symbols;
}

describe('mapping-synthesizer — entity', () => {
  it('synthesizes one er2dbEntity + N er2dbAttribute from entity-level mapping', () => {
    const symbols = setup(`
      package billing.products
      schema er
      def entity artikl {
        mapping: {
          target: { table: db.dbo.QZBOZI_DF },
          columns: { id_artiklu: IDZBOZI, název: NAZEV_ZBOZI }
        },
        attributes: [
          def attribute id_artiklu { type: int, isKey: true },
          def attribute název { type: text }
        ]
      }
    `);

    const entityEntry = symbols.get('billing.products.map.er2dbEntity.artikl');
    expect(entityEntry).toBeDefined();
    expect(entityEntry!.kind).toBe('er2dbEntity');
    expect(entityEntry!.source.line).toBeGreaterThan(0);
    expect(entityEntry!.mappingSource).toBe('inline');

    const attrA = symbols.get('billing.products.map.er2dbAttribute.artikl.id_artiklu');
    expect(attrA).toBeDefined();
    const attrB = symbols.get('billing.products.map.er2dbAttribute.artikl.název');
    expect(attrB).toBeDefined();
  });
});

describe('mapping-synthesizer — attribute', () => {
  it('synthesizes er2dbAttribute from attribute bare-id mapping', () => {
    const symbols = setup(`
      package billing.products
      schema er
      def entity foo {
        attributes: [
          def attribute id { type: int, mapping: IDX, isKey: true }
        ]
      }
    `);
    const entry = symbols.get('billing.products.map.er2dbAttribute.foo.id');
    expect(entry).toBeDefined();
    expect(entry!.mappingSource).toBe('inline');
  });
});

describe('mapping-synthesizer — relation', () => {
  it('synthesizes er2dbRelation from relation bare-fk mapping', () => {
    const symbols = setup(`
      package billing.products
      schema er
      def relation r {
        from: er.entity.a, to: er.entity.b,
        cardinality: { from: "0..*", to: "1" },
        join: [{ from: er.entity.a.x, to: er.entity.b.x }],
        mapping: db.dbo.fk_a_b
      }
    `);
    const entry = symbols.get('billing.products.map.er2dbRelation.r');
    expect(entry).toBeDefined();
    expect(entry!.mappingSource).toBe('inline');
  });
});

describe('mapping-synthesizer — source location', () => {
  it('synthesized entry points at the inline mapping value', () => {
    const symbols = setup(`
  package p
  schema er
  def entity e {
    attributes: [def attribute id { type: int, mapping: IDX }]
  }
  `);
    const entry = symbols.get('p.map.er2dbAttribute.e.id');
    expect(entry).toBeDefined();
    expect(entry!.source.line).toBe(5);
  });
});

describe('mapping-synthesizer — schemaless', () => {
  it('synthesized symbol is in project table but not in document table', () => {
    const symbols = setup(`
      package p
      schema er
      def entity e {
        attributes: [def attribute id { type: int, mapping: IDX }]
      }
    `);
    expect(symbols.get('p.map.er2dbAttribute.e.id')).toBeDefined();
  });
});