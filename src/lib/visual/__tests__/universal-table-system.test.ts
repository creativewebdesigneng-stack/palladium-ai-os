import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS: string[] = ['src/components', 'src/screens', 'src/routes'];
const EXTENSIONS = new Set<string>(['.jsx', '.tsx']);
const EXEMPT = new Set<string>([
  path.normalize('src/components/palladium/TableSurface.jsx'),
  path.normalize('src/components/ui/table.tsx'),
  path.normalize('src/screens/PublishedStudioApp.jsx'),
]);

function collect(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

describe('Blackstar universal table system', () => {
  it('requires every raw HTML table to opt into the shared responsive table surface', () => {
    const offenders = ROOTS.flatMap((root) => collect(root))
      .filter((file) => !EXEMPT.has(path.normalize(file)))
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return source.includes('<table') && !source.includes('TableSurface');
      })
      .map((file) => file.replaceAll('\\', '/'));
    expect(offenders).toEqual([]);
  });

  it('keeps public Studio table widgets theme-neutral but equally scroll/accessibility safe', () => {
    const source = fs.readFileSync('src/screens/PublishedStudioApp.jsx', 'utf8');
    expect(source).toContain('data-public-studio-table');
    expect(source).toContain('role="region"');
    expect(source).toContain('tabIndex={0}');
    expect(source).toContain('overscroll-contain');
    expect(source).toContain('sticky top-8');
  });

  it('keeps the universal table surface accessible and mobile-safe', () => {
    const source = fs.readFileSync('src/components/palladium/TableSurface.jsx', 'utf8');
    expect(source).toContain('role="region"');
    expect(source).toContain('tabIndex={0}');
    expect(source).toContain('overflow-auto');
    expect(source).toContain('overscroll-contain');
    expect(source).toContain('[&_thead]:sticky');
    expect(source).toContain('TableEmptyRow');
  });

  it('keeps shared DataTable sorting keyboard accessible and row keys stable', () => {
    const source = fs.readFileSync('src/components/palladium/DataTable.jsx', 'utf8');
    expect(source).toContain('aria-sort');
    expect(source).toContain('<button');
    expect(source).toContain("row?.[rowKey || 'id']");
    expect(source).toContain('TableSurface');
  });
});
