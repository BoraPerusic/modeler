import fs from 'node:fs';
import path from 'node:path';

export function copySamples(srcDir: string, dest: string): string[] {
  fs.mkdirSync(dest, { recursive: true });
  const manifest: string[] = [];

  function walk(src: string, dst: string, prefix: string): void {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name === '.modeler') continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const srcPath = path.join(src, entry.name);
      const dstPath = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(dstPath, { recursive: true });
        walk(srcPath, dstPath, rel);
      } else {
        fs.copyFileSync(srcPath, dstPath);
        manifest.push(rel);
      }
    }
  }

  walk(srcDir, dest, '');
  fs.writeFileSync(path.join(dest, 'index.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}