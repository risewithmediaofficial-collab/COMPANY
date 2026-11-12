import { Inbox, Search } from '@/components/ui/muiIcons';
import { cn } from '../../utils/cn';

const toneStyles = {
  primary: 'bg-brand/12 text-primary',
  success: 'bg-secondary text-zinc-800 dark:text-zinc-200',
  info: 'bg-brand/10 text-primary',
  warning: 'bg-secondary text-zinc-800 dark:text-zinc-200',
  danger: 'bg-zinc-900 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900',
  violet: 'bg-secondary text-zinc-800 dark:text-zinc-200',
  neutral: 'bg-secondary text-muted-foreground',
};

export const PageHeader = ({
  title,
  actions,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
      </div>

      {children ? <div>{children}</div> : null}
    </div>
  );
};

export const MetricGrid = ({ children, className }) => (
  <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
);

export const MetricCard = ({ label, title, value, icon: Icon, tone = 'primary', className }) => {
  const cardLabel = label || title;
  return (
    <div
      className={cn(
        'rounded-2xl bg-card px-5 py-5 transition-colors hover:bg-secondary/60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cardLabel}</p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
        </div>
        {Icon ? (
          <div className={cn('rounded-xl p-2.5 flex-shrink-0 bg-brand/10 text-primary', tone === 'danger' && toneStyles.danger)}>
            <Icon size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const StatusBadge = ({ tone = 'primary', children, className }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
      toneStyles[tone] || toneStyles.primary,
      className
    )}
  >
    {children}
  </span>
);

export const EmptyState = ({ title = 'No data', action, icon: Icon = Inbox, className }) => (
  <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
    <div className="rounded-full bg-secondary p-4 text-muted-foreground mb-3">
      <Icon size={24} />
    </div>
    <h3 className="text-base font-bold text-foreground">{title}</h3>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const PageToolbar = ({ children, className }) => (
  <div className={cn('rounded-2xl bg-card p-3.5', className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
  </div>
);

export const SearchField = ({ value, onChange, placeholder, className, inputClassName }) => (
  <div className={cn('relative flex-1', className)}>
    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-xl bg-secondary/75 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-secondary focus:bg-background focus:ring-2 focus:ring-brand/40',
        inputClassName,
      )}
    />
  </div>
);

export const SectionCard = ({ title, action, children, className }) => (
  <section className={cn('rounded-2xl bg-card', className)}>
    {(title || action) ? (
      <div className="flex flex-col gap-3 px-5 pt-5 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">{title}</h2> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    ) : null}
    <div className="p-5">{children}</div>
  </section>
);
