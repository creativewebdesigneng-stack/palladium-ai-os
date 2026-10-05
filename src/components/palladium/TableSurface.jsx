import { cn } from '@/lib/utils';

export default function TableSurface({
  children,
  label = 'Data table',
  toolbar = null,
  className = '',
  viewportClassName = '',
  contentClassName = '',
  minWidth = 680,
  maxHeight,
  stickyHeader = true,
}) {
  return (
    <div
      data-blackstar-table-surface
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] shadow-[0_16px_44px_rgba(0,0,0,.16)]',
        className,
      )}
    >
      {toolbar ? <div className="border-b border-white/10 bg-white/[.02]">{toolbar}</div> : null}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          'w-full overflow-auto overscroll-contain outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/40',
          viewportClassName,
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <div className={cn('min-w-full', contentClassName)} style={{ minWidth }}>
          <div
            className={cn(
              '[&_table]:w-full [&_table]:border-collapse [&_table]:text-left',
              '[&_thead]:border-b [&_thead]:border-white/10 [&_thead]:bg-[#0c0d13]/96 [&_thead]:text-zinc-500 [&_thead]:backdrop-blur',
              stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10',
              '[&_th]:whitespace-nowrap [&_th]:font-medium',
              '[&_tbody_tr]:border-t [&_tbody_tr]:border-white/[.055] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-white/[.028]',
              '[&_td]:align-middle',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  title = 'No rows to show',
  description = 'There is no data available for this table yet.',
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        <p className="text-xs font-medium text-zinc-400">{title}</p>
        <p className="mt-1 text-[10px] text-zinc-600">{description}</p>
      </td>
    </tr>
  );
}
