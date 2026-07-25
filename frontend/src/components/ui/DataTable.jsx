import { Edit2, Eye, Inbox, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EmptyState } from './page';

// Scrollbar style applied to the scroll container
const scrollClass = [
  'overflow-x-auto',
  'overflow-y-auto',
  '[&::-webkit-scrollbar]:h-2',
  '[&::-webkit-scrollbar]:w-2',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30',
  'hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[scrollbar-width:thin]',
  '[scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]',
].join(' ');

export const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  onEdit = null,
  onDelete = null,
  onView = null,
  onRowClick = null,
  canEditRow = null,
  canDeleteRow = null,
  emptyTitle = 'No records found',
  emptyDescription = 'Get started by creating a new entry.',
  emptyAction = null,
  // maxHeight controls the inline vertical scroll — table body scrolls, header stays fixed
  maxHeight = 'calc(100vh - 350px)',
  className,
}) => {
  const hasActions = Boolean(onView || onEdit || onDelete);

  if (loading) {
    return (
      <div className={cn('overflow-hidden rounded-[28px] border border-border bg-card shadow-sm', className)}>
        <div className={cn('w-full', scrollClass)} style={{ maxHeight }}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                {columns.map((col, i) => (
                  <th key={col.key || i} className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">
                    <div className="h-4 w-24 animate-pulse rounded-md bg-secondary" />
                  </th>
                ))}
                {hasActions ? <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 sm:px-6" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  {columns.map((col, i) => (
                    <td key={col.key || i} className="px-4 py-4 sm:px-6">
                      <div className="h-4 w-3/4 animate-pulse rounded-md bg-secondary" />
                    </td>
                  ))}
                  {hasActions ? <td className="px-4 py-4 sm:px-6" /> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-[28px] border border-border bg-card shadow-sm', className)}>
      <div className={cn('w-full', scrollClass)} style={{ maxHeight }}>
        <table className="w-full min-w-[760px] text-left text-sm">
          {/* Sticky header — stays fixed while rows scroll */}
          <thead className="text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">
                  {col.label}
                </th>
              ))}
              {hasActions ? (
                <th scope="col" className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 text-right font-semibold sm:px-6">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => {
              const interactive = Boolean(onRowClick);

              return (
                <tr
                  key={row._id}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'group transition-colors hover:bg-secondary/20',
                    interactive ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20' : '',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4 align-middle sm:px-6">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="px-4 py-4 text-right align-middle sm:px-6">
                      <div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        {onView ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onView(row);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            title="View"
                            aria-label={`View ${row.name || row.title || 'record'}`}
                          >
                            <Eye size={16} />
                          </button>
                        ) : null}
                        {onEdit && (!canEditRow || canEditRow(row)) ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(row);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            title="Edit"
                            aria-label={`Edit ${row.name || row.title || 'record'}`}
                          >
                            <Edit2 size={16} />
                          </button>
                        ) : null}
                        {onDelete && (!canDeleteRow || canDeleteRow(row)) ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(row._id);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                            aria-label={`Delete ${row.name || row.title || 'record'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
