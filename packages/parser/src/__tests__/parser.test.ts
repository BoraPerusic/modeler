import { describe, it, expect } from 'vitest';
import { parseString, parseFile } from '../index.js';
import path from 'path';
import fs from 'fs/promises';

const samplesDir = path.resolve(__dirname, '../../../../samples');

async function getAllTtrFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await getAllTtrFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ttr')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('parser', () => {
  it('parseString("") returns empty Document with no errors', () => {
    const result = parseString('');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.definitions).toHaveLength(0);
  });

  it('parseString("schema db namespace dbo") returns schemaDirective with schemaCode === "db" and namespace === "dbo"', () => {
    const result = parseString('schema db namespace dbo');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.schemaDirective?.schemaCode).toBe('db');
    expect(result.ast?.schemaDirective?.namespace).toBe('dbo');
  });

  it('parseString("def entity foo {}") returns one Definition with kind === "entity" and name === "foo"', () => {
    const result = parseString('def entity foo {}');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.definitions).toHaveLength(1);
    expect(result.ast?.definitions[0].kind).toBe('entity');
    expect(result.ast?.definitions[0].name).toBe('foo');
  });

  it('syntax error case returns at least one ParseError with non-zero line/column', () => {
    const result = parseString('def entity {');
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error.severity).toBe('error');
    expect(error.source.line).toBeGreaterThan(0);
    expect(error.source.column).toBeGreaterThan(0);
  });
});

describe('parseFile', () => {
  it('parses samples/v1-metadata/er.ttr with no errors and returns >0 entity definitions', async () => {
    const result = await parseFile(path.join(samplesDir, 'v1-metadata/er.ttr'));
    expect(result.errors).toHaveLength(0);
    const entities = result.ast?.definitions.filter((d) => d.kind === 'entity') ?? [];
    expect(entities.length).toBeGreaterThan(0);
  });

  it('parses all sample files without errors', async () => {
    const ttrFiles = await getAllTtrFiles(samplesDir);

    for (const file of ttrFiles) {
      const result = await parseFile(file);
      expect(result.errors, `Errors in ${file}: ${result.errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
    }
  });
});