import { isValidElement } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

export const NotionDetailPage = ({
  backTo,
  backLabel,
  icon: Icon,
  iconContent,
  title,
  subtitle,
  status,
  statusClassName,
  actions,
  children,
  className,
}) => (
  <div className={cn('mx-auto max-w-6xl space-y-6 pb-16', className)}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-2">
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        {backTo ? (
          <Link to={backTo} className="flex items-center gap-1 transition-colors hover:text-foreground">
            <ChevronLeft size={16} />
            <span>{backLabel || 'Back'}</span>
          </Link>
        ) : null}
        {backTo ? <span className="text-muted-foreground/50">/</span> : null}
        <span className="truncate font-bold text-foreground">{title}</span>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>

    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/70 text-primary shadow-xs">
            {Icon ? <Icon size={22} /> : <span className="text-lg font-black">{iconContent}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="break-words text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
              {isValidElement(status) ? status : status ? (
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                    statusClassName || 'bg-primary/10 text-primary',
                  )}
                >
                  {status}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
      </div>

      {children ? <div className="mt-6 border-t border-border/70 pt-5">{children}</div> : null}
    </section>
  </div>
);

export const NotionSection = ({ title, children, className }) => (
  <div className={cn('space-y-1', className)}>
    {title ? (
      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
        {title}
      </p>
    ) : null}
    {children}
  </div>
);

export const NotionProperty = ({ icon: Icon, label, value, children, accent, hideEmpty = true }) => {
  const content = children ?? value;
  if (hideEmpty && (content === null || content === undefined || content === '')) return null;

  return (
    <div className="grid gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/45 sm:grid-cols-[180px_1fr]">
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        {Icon ? <Icon size={14} className={cn('shrink-0', accent || 'text-muted-foreground/70')} /> : null}
        <span className="truncate uppercase tracking-wider">{label}</span>
      </div>
      <div className="min-w-0 break-words text-sm font-medium leading-6 text-foreground">
        {content || <span className="text-muted-foreground">-</span>}
      </div>
    </div>
  );
};

export const NotionPropertyGrid = ({ children, className }) => (
  <div className={cn('grid gap-x-4 gap-y-1 lg:grid-cols-2', className)}>{children}</div>
);

export const NotionTabs = ({ tabs, activeTab, onTabChange, className }) => (
  <div className={cn('flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5', className)}>
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {Icon ? <Icon size={15} /> : null}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);

export default NotionDetailPage;
