import { Inbox, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

const toneStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  info: 'bg-blue-500/10 text-blue-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger: 'bg-red-500/10 text-red-600',
  violet: 'bg-violet-500/10 text-violet-600',
  neutral: 'bg-secondary text-muted-foreground',
};

export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}) => (
  <section
    className={cn(
      'overflow-hidden rounded-[30px] border border-border bg-gradient-to-br from-background via-background to-secondary/70 shadow-sm',
      className,
    )}
  >
    <div className="p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{eyebrow}</p>
          ) : null}
          <h1 className={cn('text-3xl font-bold tracking-tight text-foreground sm:text-4xl', eyebrow && 'mt-3')}>{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div> : null}
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  </section>
);

export const MetricGrid = ({ children, className }) => (
  <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
);

export const MetricCard = ({ label, title, value, icon: Icon, tone = 'primary', className }) => {
  const cardLabel = label || title;
  return (
    <div
      className={cn(
        'rounded-[24px] border border-border/80 bg-card/90 px-4 py-4 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{cardLabel}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        {Icon ? (
          <div className={cn('rounded-2xl p-3 flex-shrink-0', toneStyles[tone] || toneStyles.primary)}>
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

export const EmptyState = ({ title = 'No data', description = 'There is no data available right now.', action, icon: Icon = Inbox, className }) => (
  <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
    <div className="rounded-full bg-secondary p-4 text-muted-foreground mb-3">
      <Icon size={24} />
    </div>
    <h3 className="text-base font-bold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const PageToolbar = ({ children, className }) => (
  <div className={cn('rounded-[24px] border border-border/80 bg-card/85 p-3 shadow-sm backdrop-blur-sm', className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
  </div>
);

export const SearchField = ({ value, onChange, placeholder, className, inputClassName }) => (
  <div className={cn('relative flex-1', className)}>
    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm shadow-inner outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15',
        inputClassName,
      )}
    />
  </div>
);

export const SectionCard = ({ title, action, children, className }) => (
  <section className={cn('rounded-[28px] border border-border bg-card shadow-sm', className)}>
    {(title || action) ? (
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className="text-lg font-bold text-foreground">{title}</h2> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    ) : null}
    <div className="p-5">{children}</div>
  </section>
);
