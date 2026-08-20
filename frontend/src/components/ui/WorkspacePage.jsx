import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Helper to safely render any icon type:
 * - Lucide React icons (ForwardRef objects with $$typeof/render)
 * - Function components
 * - Valid React elements (<Icon />)
 * - String emojis ("📞", "🌐", "👥")
 */
const renderIconHelper = (iconInput, defaultProps = {}) => {
  if (!iconInput) return null;
  if (React.isValidElement(iconInput)) return iconInput;
  if (
    typeof iconInput === 'function' ||
    (typeof iconInput === 'object' && iconInput !== null && ('render' in iconInput || '$$typeof' in iconInput))
  ) {
    return React.createElement(iconInput, defaultProps);
  }
  if (typeof iconInput === 'string') {
    return <span className={defaultProps.className || 'select-none'}>{iconInput}</span>;
  }
  return null;
};

/**
 * WorkspacePage - Standardized Notion-Style Workspace Container
 * Provides consistent breadcrumbs, title, icon/emoji header, properties banner, and action toolbar.
 */
export function WorkspacePage({
  title,
  subtitle,
  icon,
  emoji,
  breadcrumbs = [],
  actions,
  properties,
  children,
  className = '',
}) {
  const toneClasses = {
    neutral: 'bg-secondary/60 text-foreground border-border/60',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  const isIconComponent =
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon));

  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${className}`}>
      {/* Workspace Header Block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          {isIconComponent ? (
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              {renderIconHelper(icon, { size: 22 })}
            </div>
          ) : icon ? (
            <span className="text-2xl sm:text-3xl shrink-0 select-none">
              {renderIconHelper(icon, { className: 'text-2xl sm:text-3xl select-none' })}
            </span>
          ) : emoji ? (
            <span className="text-2xl sm:text-3xl shrink-0 select-none">{emoji}</span>
          ) : null}

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Notion-Style Properties & Metrics Banner */}
      {properties && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-secondary/20 rounded-2xl border border-border/60 text-xs">
          {Array.isArray(properties) ? (
            properties.map((prop, idx) => {
              if (!prop) return null;
              const tone = prop.tone || 'neutral';
              return (
                <div
                  key={prop.label || idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                    toneClasses[tone] || toneClasses.neutral
                  }`}
                >
                  {prop.icon && renderIconHelper(prop.icon, { size: 13, className: 'shrink-0 text-muted-foreground' })}
                  <span className="text-muted-foreground font-medium">{prop.label}:</span>
                  <span className="font-bold text-foreground">{prop.value}</span>
                </div>
              );
            })
          ) : (
            properties
          )}
        </div>
      )}

      {/* Main Page Workspace Content */}
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

export default WorkspacePage;
