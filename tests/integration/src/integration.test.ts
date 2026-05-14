import { describe, it, expect, beforeAll } from 'vitest';
import { parseFile } from '@modeler/parser';
import path from 'path';

const samplesDir = path.resolve(__dirname, '../../../samples');

async function getAllTtrFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const fs = await import('fs/promises');
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

describe('parser integration', () => {
  let ttrFiles: string[];

  beforeAll(async () => {
    ttrFiles = await getAllTtrFiles(samplesDir);
  });

  it('parses all sample files without errors', async () => {
    for (const file of ttrFiles) {
      const result = await parseFile(file);
      expect(result.errors, `Errors in ${file}: ${result.errors.map(e => e.message).join(', ')}`).toHaveLength(0);
    }
  });

  it('parses samples/v1-metadata/er.ttr with >0 entity definitions', async () => {
    const result = await parseFile(path.join(samplesDir, 'v1-metadata/er.ttr'));
    expect(result.errors).toHaveLength(0);
    const entities = result.ast?.definitions.filter(d => d.kind === 'entity') ?? [];
    expect(entities.length).toBeGreaterThan(0);
  });
});