import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import TableSurface, { TableEmptyRow } from '@/components/palladium/TableSurface';

export default function DataTable({
  columns = [],
  data = [],
  searchable = true,
  searchKeys,
  emptyTitle,
  emptyDesc,
  onRowClick,
  rowKey,
  label = 'Data table',
  searchPlaceholder = 'Filter table…',
  minWidth,
  maxHeight,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let rows = Array.isArray(data) ? data : [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const keys = searchKeys || columns.map((column) => column.key);
      rows = rows.filter((row) =>
        keys.some((key) => String(row?.[key] ?? '').toLowerCase().includes(q)),
      );
    }
    if (sort.key) {
      rows = [...rows].sort((a, b) => {
        const av = a?.[sort.key];
        const bv = b?.[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        const result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return sort.dir === 'asc' ? result : -result;
      });
    }
    return rows;
  }, [data, query, sort, searchKeys, columns]);

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  const resolvedMinWidth = minWidth ?? Math.max(620, columns.length * 140);
  const toolbar = searchable ? (
    <label className="flex items-center gap-2 px-3 py-2.5">
      <Search className="h-4 w-4 text-zinc-500" />
      <span className="sr-only">Filter {label}</span>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
      />
      <span className="text-[10px] tabular-nums text-zinc-600">
        {filtered.length}/{Array.isArray(data) ? data.length : 0}
      </span>
    </label>
  ) : null;

  return (
    <TableSurface
      label={label}
      toolbar={toolbar}
      minWidth={resolvedMinWidth}
      maxHeight={maxHeight}
      className="rounded-xl"
    >
      <table className="text-sm">
        <thead className="text-[11px] uppercase tracking-wider">
          <tr>
            {columns.map((column) => {
              const sortable = column.sortable !== false;
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  className={`px-4 py-3 ${column.headerClassName || ''}`}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 rounded-md text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                    >
                      {column.label}
                      {active && (sort.dir === 'asc'
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, index) => {
            const key = typeof rowKey === 'function'
              ? rowKey(row, index)
              : row?.[rowKey || 'id'] ?? index;
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3.5 text-zinc-300 ${column.className || ''}`}>
                    {column.render ? column.render(row) : String(row?.[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <TableEmptyRow
              colSpan={Math.max(1, columns.length)}
              title={emptyTitle || 'No results'}
              description={emptyDesc || (query ? 'Try adjusting your filter.' : 'No rows are available yet.')}
            />
          )}
        </tbody>
      </table>
    </TableSurface>
  );
}
