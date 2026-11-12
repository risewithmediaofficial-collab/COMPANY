import { X, Trash2, CheckSquare, Archive } from '@/components/ui/muiIcons';
import { Button } from './button';

/**
 * BulkActionsToolbar component
 * Displays available bulk actions for selected items
 */
const BulkActionsToolbar = ({
  selectedCount,
  onClearSelection,
  actions = [], // Array of { label, icon, onClick, variant }
  className = '',
}) => {
  if (selectedCount === 0) return null;

  const defaultActions = [
    {
      id: 'select-all',
      label: 'Select All',
      icon: CheckSquare,
      onClick: () => {},
      variant: 'outline',
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      onClick: () => {},
      variant: 'outline',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: () => {},
      variant: 'destructive',
    },
  ];

  const mergedActions = [...defaultActions, ...actions];

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-border bg-card px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">
          {selectedCount} selected
        </span>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          {mergedActions.slice(0, 3).map((action) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                title={action.label}
              >
                <IconComponent size={16} className="mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClearSelection}
        className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        title="Clear selection"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default BulkActionsToolbar;
