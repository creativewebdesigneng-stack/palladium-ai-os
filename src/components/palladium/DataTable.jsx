import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Search, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/palladium/ErrorState';

// Standardised reusable data table with sort + search, built on the PalladiumAI design system.
export default function DataTable({ columns, data, searchable = true, searchKeys, emptyTitle, emptyDesc, onRowClick }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let rows = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      const keys = searchKeys || columns.map((c) => c.key);
      rows = rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    }
    if (sort.key) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
        return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [data, query, sort, searchKeys, columns]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {searchable && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[.02] px-3 py-2.5">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter table"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[.03] text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-medium ${c.sortable !== false ? 'cursor-pointer select-none hover:text-white' : ''}`} onClick={() => c.sortable !== false && toggleSort(c.key)}>
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} className={`transition ${onRowClick ? 'cursor-pointer' : ''} hover:bg-white/[.03]`}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5 text-zinc-300">
                    {c.render ? c.render(row) : String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState icon={Inbox} title={emptyTitle || 'No results'} desc={emptyDesc || 'Try adjusting your filter.'} />}
    </div>
  );
}