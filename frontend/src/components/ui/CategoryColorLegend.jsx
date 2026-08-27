// =============================================
// BOARD CATEGORY COLOR LEGEND & VISUAL GUIDE
// =============================================

import React, { useState } from 'react';
import {
  Globe,
  Layout,
  Share2,
  Search,
  Target,
  Sparkles,
  Palette,
  Video,
  Smartphone,
  ShoppingBag,
  Rocket,
  Wrench,
  FileText,
  FolderKanban,
  Megaphone,
  Film,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const BOARD_CATEGORY_DEFINITIONS = [
  {
    key: 'website',
    label: 'Website / Web Dev',
    description: 'Web development, redesigns, landing pages & CMS',
    icon: Globe,
    dotColor: 'bg-blue-500',
    borderClass: 'border-l-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    swatchClass: 'bg-blue-500',
  },
  {
    key: 'social_media',
    label: 'Social Media / SMM',
    description: 'Instagram, Reels, Carousel posts & content calendar',
    icon: Share2,
    dotColor: 'bg-purple-500',
    borderClass: 'border-l-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    swatchClass: 'bg-purple-500',
  },
  {
    key: 'video_production',
    label: 'Video Production',
    description: 'Shooting, reels editing, YouTube & promo videos',
    icon: Video,
    dotColor: 'bg-rose-500',
    borderClass: 'border-l-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    swatchClass: 'bg-rose-500',
  },
  {
    key: 'branding',
    label: 'Branding & Design',
    description: 'Logos, brand identities, graphic designs & posters',
    icon: Palette,
    dotColor: 'bg-pink-500',
    borderClass: 'border-l-pink-500',
    badgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
    swatchClass: 'bg-pink-500',
  },
  {
    key: 'paid_ads',
    label: 'Paid Ads / Meta & Google',
    description: 'Meta Ads, PPC campaigns, creatives & lead gen',
    icon: Megaphone,
    dotColor: 'bg-red-500',
    borderClass: 'border-l-red-500',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    swatchClass: 'bg-red-500',
  },
  {
    key: 'seo',
    label: 'SEO & Search Optimization',
    description: 'Keywords, backlinks, audits & Google search rankings',
    icon: Search,
    dotColor: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    swatchClass: 'bg-amber-500',
  },
  {
    key: 'saas_product',
    label: 'SaaS Platform / Software',
    description: 'In-house SaaS products, web portals & engineering',
    icon: Rocket,
    dotColor: 'bg-indigo-500',
    borderClass: 'border-l-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    swatchClass: 'bg-indigo-500',
  },
  {
    key: 'content',
    label: 'Content Writing & Scripts',
    description: 'Scriptwriting, blogs, copy & caption drafting',
    icon: FileText,
    dotColor: 'bg-sky-500',
    borderClass: 'border-l-sky-500',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    swatchClass: 'bg-sky-500',
  },
];

/**
 * CategoryColorLegend Component
 * Renders a rich, interactive guide defining each board category color
 */
export const CategoryColorLegend = ({
  selectedCategory = 'all',
  onSelectCategory,
  title = 'Board Color Code Guide',
  description = 'Card left-border color accents identify deliverable & project categories at a glance',
  className = '',
  collapsible = true,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-3 sm:p-3.5 shadow-xs space-y-2.5 transition-all ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            🎨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{title}</span>
              <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                • {description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSelectCategory && selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-[10px] font-bold text-primary hover:underline px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Clear Filter
            </button>
          )}

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Color Pills & Descriptions */}
      {isExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1 border-t border-border/50">
          {BOARD_CATEGORY_DEFINITIONS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedCategory === item.key;
            return (
              <div
                key={item.key}
                onClick={() => onSelectCategory?.(isSelected ? 'all' : item.key)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 group select-none ${
                  isSelected
                    ? `${item.badgeClass} ring-2 ring-primary/40 font-bold shadow-xs`
                    : 'border-border/60 bg-secondary/30 hover:border-border hover:bg-secondary/60 text-foreground'
                }`}
                title={`${item.label}: ${item.description}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.dotColor} shrink-0 shadow-2xs`} />
                    <Icon size={12} className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <span className={`h-1.5 w-4 rounded-full ${item.swatchClass} opacity-80`} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[11px] font-bold tracking-tight block truncate leading-tight">
                    {item.label}
                  </span>
                  <p className="text-[9px] text-muted-foreground truncate leading-none">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryColorLegend;
