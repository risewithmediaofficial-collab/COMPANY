import React, { useState } from 'react';
import { Plus, Trash2, Target, Video, Film, Image, BookOpen, Layers, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const STANDARD_DELIVERABLE_TYPES = [
  { value: 'Video', label: '🎬 Video', icon: Video },
  { value: 'Reel', label: '📱 Reel / Short', icon: Film },
  { value: 'Poster', label: '🖼️ Poster / Static Post', icon: Image },
  { value: 'Story', label: '📖 Story', icon: BookOpen },
  { value: 'Carousel Post', label: '📑 Carousel Post', icon: Layers },
  { value: 'Social Media Post', label: '🌐 Social Media Post', icon: Sparkles },
  { value: 'Blog', label: '✍️ Blog Article', icon: BookOpen },
  { value: 'Ad Creative', label: '🎯 Ad Creative', icon: Target },
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MonthlyDeliverablesSection = ({
  deliverables = [],
  onChange,
  month,
  year,
  onMonthChange,
  onYearChange,
  readOnly = false,
}) => {
  const [selectedType, setSelectedType] = useState('Video');
  const [customType, setCustomType] = useState('');
  const [targetQty, setTargetQty] = useState('8');
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const handleAdd = () => {
    setError('');
    const typeToAdd = selectedType === 'Custom' ? customType.trim() : selectedType;
    if (!typeToAdd) {
      setError('Please specify a content/deliverable type.');
      return;
    }

    const qty = parseInt(targetQty, 10);
    if (isNaN(qty) || qty < 1) {
      setError('Target quantity must be at least 1.');
      return;
    }

    // Check duplicate
    const isDuplicate = deliverables.some(
      (d) => d.contentType.trim().toLowerCase() === typeToAdd.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${typeToAdd}" target is already configured for this month.`);
      return;
    }

    const updated = [
      ...deliverables,
      {
        contentType: typeToAdd,
        targetQuantity: qty,
      },
    ];

    onChange?.(updated);
    if (selectedType === 'Custom') setCustomType('');
    setTargetQty('8');
  };

  const handleRemove = (index) => {
    const updated = deliverables.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const handleQtyChange = (index, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const updated = [...deliverables];
    updated[index] = { ...updated[index], targetQuantity: qty };
    onChange?.(updated);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/15 p-4 sm:p-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Monthly Deliverables & Targets</h3>
            <p className="text-xs text-muted-foreground">
              Optional targets for content quotas and over-task tracking
            </p>
          </div>
        </div>

        {/* Month & Year pickers */}
        <div className="flex items-center gap-2">
          <Select
            value={String(month || new Date().getMonth() + 1)}
            onValueChange={(v) => onMonthChange?.(parseInt(v, 10))}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 w-32 rounded-xl text-xs font-semibold">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, idx) => (
                <SelectItem key={name} value={String(idx + 1)} className="text-xs font-medium">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(year || new Date().getFullYear())}
            onValueChange={(v) => onYearChange?.(parseInt(v, 10))}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 w-24 rounded-xl text-xs font-semibold">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-medium">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add New Target Row */}
      {!readOnly && (
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-card/60 p-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Deliverable Target</div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Content / Deliverable Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_DELIVERABLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs font-medium">
                      {t.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="Custom" className="text-xs font-medium">
                    ✨ Custom Deliverable...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedType === 'Custom' && (
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Custom Type Name</label>
                <Input
                  className="h-9 rounded-xl text-xs"
                  placeholder="e.g. Infographic, Newsletter"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              </div>
            )}

            <div className={`${selectedType === 'Custom' ? 'sm:col-span-3' : 'sm:col-span-4'} space-y-1`}>
              <label className="text-[11px] font-semibold text-muted-foreground">Target Quantity</label>
              <Input
                type="number"
                min="1"
                className="h-9 rounded-xl text-xs"
                placeholder="e.g. 8"
                value={targetQty}
                onChange={(e) => setTargetQty(e.target.value)}
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <Button
                type="button"
                onClick={handleAdd}
                size="sm"
                className="h-9 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus size={14} className="mr-1.5" /> Add Target
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mt-1">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Targets List */}
      <div className="space-y-2">
        {deliverables.length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
            No monthly deliverables configured yet for {MONTH_NAMES[(month || 1) - 1]} {year || currentYear}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {deliverables.map((item, index) => {
              const matchedType = STANDARD_DELIVERABLE_TYPES.find(
                (t) => t.value.toLowerCase() === item.contentType.toLowerCase()
              );
              const IconComponent = matchedType?.icon || Target;

              return (
                <div
                  key={`${item.contentType}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/80 text-foreground font-semibold text-xs">
                      <IconComponent size={15} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.contentType}</p>
                      <p className="text-[11px] text-muted-foreground">Monthly Target</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!readOnly ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          className="h-7 w-16 text-center text-xs font-bold rounded-lg"
                          value={item.targetQuantity}
                          onChange={(e) => handleQtyChange(index, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete Target"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-extrabold text-foreground">
                        {item.targetQuantity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyDeliverablesSection;
