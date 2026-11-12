import React from 'react';
import { X } from '@/components/ui/muiIcons';

export const SMMDrawer = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 animate-in fade-in duration-150"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          className={`w-screen ${maxWidth} bg-card flex flex-col h-full animate-in slide-in-from-right duration-200`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-card shrink-0">
            <div className="min-w-0 pr-2 text-left">
              <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight truncate">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6 text-left custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
