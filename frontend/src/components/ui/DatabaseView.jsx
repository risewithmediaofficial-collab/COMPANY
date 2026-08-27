import React, { useState, useRef } from 'react';
import {
  Table as TableIcon,
  LayoutGrid,
  Calendar as CalendarIcon,
  List as ListIcon,
  Search,
  Filter,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AppTooltip } from './tooltip';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { getCategoryTheme } from '../../utils/categoryColors';

const DEFAULT_VIEW_META = {
  table: { label: 'Table', icon: TableIcon },
  cards: { label: 'Cards', icon: LayoutGrid },
  kanban: { label: 'Board', icon: Layers },
  board: { label: 'Board', icon: Layers },
  calendar: { label: 'Calendar', icon: CalendarIcon },
  list: { label: 'List', icon: ListIcon },
};

/**
 * DatabaseView - Notion-Style Multi-View Container
 * Seamlessly manages Table, Cards Grid, Kanban Board, and List views with built-in search and responsive layouts.
 */
export function DatabaseView({
  viewKey,
  views = ['board', 'table'],
  activeView: controlledActiveView,
  onViewChange,
  items = [],
  columns = [],
  totalCount,
  searchPlaceholder = 'Filter records...',
  searchQuery,
  onSearchChange,
  filters,
  actions,
  renderCard,
  renderKanbanCard,
  kanbanColumns = [],
  groupBy = 'status',
  onItemMove,
  onStatusChange,
  children,
}) {
  // Normalize views array
  const normalizedViews = views.map((v) => {
    if (typeof v === 'string') {
      const meta = DEFAULT_VIEW_META[v] || { label: v.charAt(0).toUpperCase() + v.slice(1), icon: TableIcon };
      return { id: v, label: meta.label, icon: meta.icon };
    }
    return v;
  });

  const [internalView, setInternalView] = useState(() => {
    if (viewKey) {
      const saved = localStorage.getItem(viewKey);
      if (saved && normalizedViews.some((v) => v.id === saved || (['board', 'kanban'].includes(v.id) && ['board', 'kanban'].includes(saved)))) {
        return saved;
      }
    }
    return normalizedViews[0]?.id || 'board';
  });

  const currentView = controlledActiveView !== undefined ? controlledActiveView : internalView;

  const handleViewSelect = (id) => {
    setInternalView(id);
    if (viewKey) {
      localStorage.setItem(viewKey, id);
    }
    if (onViewChange) onViewChange(id);
  };

  const [localSearch, setLocalSearch] = useState('');
  const activeSearch = searchQuery !== undefined ? searchQuery : localSearch;

  const handleSearchChange = (val) => {
    setLocalSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  // Drag & drop state for Kanban
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const kanbanScrollRef = useRef(null);

  // Smooth side auto-scroll while dragging cards
  useAutoScrollOnDrag(kanbanScrollRef, Boolean(draggingId));

  const handleDragStart = (e, item) => {
    const id = item._id || item.id;
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      id,
      fromStatus: item[groupBy],
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverIndex(null);
  };

  const handleColumnDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleItemDragOver = (e, colKey, idx) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colKey);
    
    // Determine if cursor is in top half or bottom half of the card
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIdx = e.clientY < midY ? idx : idx + 1;
    setDragOverIndex(targetIdx);
  };

  const handleDrop = (e, colKey, dropIdx = null) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) {
      handleDragEnd();
      return;
    }

    if (onItemMove) {
      onItemMove({
        id: itemId,
        targetStatus: colKey,
        targetIndex: dropIdx !== null ? dropIdx : dragOverIndex,
      });
    } else if (onStatusChange) {
      onStatusChange(itemId, colKey);
    }

    handleDragEnd();
  };

  return (
    <div className="space-y-4">
      {/* Database Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-card rounded-2xl border border-border shadow-xs">
        {/* View Switchers */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
          {normalizedViews.map((v) => {
            const Icon = v.icon;
            const isSelected = currentView === v.id || (['board', 'kanban'].includes(v.id) && ['board', 'kanban'].includes(currentView));
            return (
              <AppTooltip key={v.id} content={`Switch to ${v.label} View`}>
                <button
                  type="button"
                  onClick={() => handleViewSelect(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{v.label}</span>
                  {v.count !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {v.count}
                    </span>
                  )}
                </button>
              </AppTooltip>
            );
          })}
        </div>

        {/* Search & Action Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          <div className="relative min-w-[200px] w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full transition-all"
            />
          </div>

          {actions}

          {totalCount !== undefined && (
            <AppTooltip content="Total items in this dataset">
              <span className="hidden sm:inline-flex items-center text-xs font-semibold text-muted-foreground px-2.5 py-1 bg-secondary/50 rounded-xl whitespace-nowrap cursor-default">
                {totalCount} {totalCount === 1 ? 'record' : 'records'}
              </span>
            </AppTooltip>
          )}
        </div>
      </div>

      {/* Dedicated Filters Toolbar */}
      {filters && (
        <div className="flex items-center gap-2.5 flex-wrap p-2.5 bg-card/70 rounded-2xl border border-border/80 shadow-xs">
          {filters}
        </div>
      )}

      {/* View Content Renderer */}
      {children ? (
        children
      ) : (
        <div className="min-w-0">
          {/* 1. TABLE VIEW */}
          {currentView === 'table' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-bold">
                      {columns.map((col, idx) => (
                        <th key={col.key || idx} className="py-3 px-4 whitespace-nowrap bg-secondary/40">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length > 0 ? (
                      items.map((item, rowIdx) => (
                        <tr
                          key={item._id || item.id || rowIdx}
                          className="hover:bg-secondary/30 transition-colors group"
                        >
                          {columns.map((col, colIdx) => (
                            <td key={col.key || colIdx} className="py-3 px-4 align-middle">
                              {col.render ? col.render(item, rowIdx) : item[col.key] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="py-12 text-center text-xs text-muted-foreground">
                          No matching records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. CARDS GRID VIEW */}
          {currentView === 'cards' && (
            <div>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={item._id || item.id || idx}
                      className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      {renderCard ? renderCard(item, idx) : JSON.stringify(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
                  No records to display.
                </div>
              )}
            </div>
          )}

          {/* 3. KANBAN BOARD VIEW (With Smooth Click & Drag Between Columns & Up/Down Reordering) */}
          {(currentView === 'kanban' || currentView === 'board') && (
            <div ref={kanbanScrollRef} className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="grid w-max min-w-full auto-cols-[minmax(280px,320px)] grid-flow-col gap-4">
                {kanbanColumns.map((col) => {
                  const colItems = items.filter((item) => {
                    const val = item[groupBy];
                    return val === col.key || (typeof val === 'string' && val.toLowerCase() === col.key.toLowerCase());
                  });
                  const isColActive = dragOverColumn === col.key;

                  return (
                    <div
                      key={col.key}
                      onDragOver={(e) => handleColumnDragOver(e, col.key)}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          if (dragOverColumn === col.key) setDragOverColumn(null);
                        }
                      }}
                      onDrop={(e) => handleDrop(e, col.key)}
                      className={`flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-2xl border transition-all p-3 space-y-3 ${
                        isColActive
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border bg-secondary/20'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-foreground uppercase tracking-wider">{col.label}</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                            {colItems.length}
                          </span>
                        </div>
                      </div>

                      {/* Column Cards */}
                      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar pr-0.5">
                        {colItems.map((item, idx) => {
                          const itemId = item._id || item.id || idx;
                          const isBeingDragged = draggingId === itemId;
                          const showDropIndicatorBefore = isColActive && dragOverIndex === idx && !isBeingDragged;

                          return (
                            <React.Fragment key={itemId}>
                              {showDropIndicatorBefore && (
                                <div className="h-2 my-1 rounded-full bg-primary/60 animate-pulse transition-all shadow-xs" />
                              )}
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleItemDragOver(e, col.key, idx)}
                                onDrop={(e) => handleDrop(e, col.key, idx)}
                                className={`p-3.5 rounded-2xl border border-border bg-card hover:border-primary/50 shadow-xs transition-all cursor-grab active:cursor-grabbing border-l-[4px] ${
                                  getCategoryTheme(item.category || item.taskCategory || item.taskType || item.type).accentBorder
                                } ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40'
                                    : 'hover:shadow-md hover:-translate-y-0.5'
                                }`}
                              >
                                {renderKanbanCard
                                  ? renderKanbanCard(item, idx)
                                  : renderCard
                                  ? renderCard(item, idx)
                                  : item.title || item.name}
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* Drop indicator at the bottom of the list */}
                        {isColActive && dragOverIndex >= colItems.length && (
                          <div className="h-2 my-1 rounded-full bg-primary/60 animate-pulse transition-all shadow-xs" />
                        )}

                        {colItems.length === 0 && (
                          <div
                            onDragOver={(e) => handleColumnDragOver(e, col.key)}
                            onDrop={(e) => handleDrop(e, col.key, 0)}
                            className={`py-8 text-center text-xs border border-dashed rounded-xl transition-all ${
                              isColActive
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground/60 border-border/60'
                            }`}
                          >
                            {isColActive ? 'Drop here to move to ' + col.label : 'Empty'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DatabaseView;
