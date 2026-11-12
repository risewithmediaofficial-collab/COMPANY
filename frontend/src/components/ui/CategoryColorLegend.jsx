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
} from '@/components/ui/muiIcons';

export const BOARD_CATEGORY_DEFINITIONS = [
  {
    key: 'web_development',
    aliases: ['website', 'web_design', 'web', 'website_development', 'website_update', 'landing_page', 'website_dev'],
    label: 'Website / Web Dev',
    description: 'Web development, redesigns, landing pages & CMS',
    icon: Globe,
    dotColor: 'bg-zinc-900 dark:bg-zinc-100',
    borderClass: 'border-l-zinc-900 dark:border-l-zinc-100',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:text-zinc-100 border-zinc-900/25 dark:border-zinc-200/25',
    swatchClass: 'bg-zinc-900 dark:bg-zinc-100',
  },
  {
    key: 'social_media',
    aliases: ['social_media_post', 'social', 'smm', 'reel', 'story', 'carousel_post', 'instagram'],
    label: 'Social Media / SMM',
    description: 'Instagram, Reels, Carousel posts & content calendar',
    icon: Share2,
    dotColor: 'bg-zinc-700 dark:bg-zinc-300',
    borderClass: 'border-l-zinc-700 dark:border-l-zinc-300',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/30',
    swatchClass: 'bg-zinc-700 dark:bg-zinc-300',
  },
  {
    key: 'video_content',
    aliases: ['video_production', 'video', 'video_shoot', 'shorts', 'youtube', 'shoot'],
    label: 'Video Production',
    description: 'Shooting, reels editing, YouTube & promo videos',
    icon: Video,
    dotColor: 'bg-zinc-600 dark:bg-zinc-400',
    borderClass: 'border-l-zinc-600 dark:border-l-zinc-400',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/30',
    swatchClass: 'bg-zinc-600 dark:bg-zinc-400',
  },
  {
    key: 'branding',
    aliases: ['graphic_design', 'poster', 'logo', 'design', 'brand'],
    label: 'Branding & Design',
    description: 'Logos, brand identities, graphic designs & posters',
    icon: Palette,
    dotColor: 'bg-zinc-500 dark:bg-zinc-400',
    borderClass: 'border-l-zinc-500 dark:border-l-zinc-400',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/30',
    swatchClass: 'bg-zinc-500 dark:bg-zinc-400',
  },
  {
    key: 'paid_ads',
    aliases: ['ads_campaign', 'ads_setup', 'ads', 'ppc', 'meta_ads', 'google_ads'],
    label: 'Paid Ads / Meta & Google',
    description: 'Meta Ads, PPC campaigns, creatives & lead gen',
    icon: Megaphone,
    dotColor: 'bg-neutral-800 dark:bg-neutral-200',
    borderClass: 'border-l-neutral-800 dark:border-l-neutral-200',
    badgeClass: 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/30',
    swatchClass: 'bg-neutral-800 dark:bg-neutral-200',
  },
  {
    key: 'seo',
    aliases: ['seo_work', 'search', 'seo_optimization'],
    label: 'SEO & Search Optimization',
    description: 'Keywords, backlinks, audits & Google search rankings',
    icon: Search,
    dotColor: 'bg-neutral-600 dark:bg-neutral-400',
    borderClass: 'border-l-neutral-600 dark:border-l-neutral-400',
    badgeClass: 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/30',
    swatchClass: 'bg-neutral-600 dark:bg-neutral-400',
  },
  {
    key: 'saas_product',
    aliases: ['saas', 'internal_tool', 'internal_product', 'software', 'platform', 'crm', 'app', 'mobile_app'],
    label: 'SaaS Platform / Software',
    description: 'In-house SaaS products, web portals & engineering',
    icon: Rocket,
    dotColor: 'bg-zinc-800 dark:bg-zinc-200',
    borderClass: 'border-l-zinc-800 dark:border-l-zinc-200',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/30',
    swatchClass: 'bg-zinc-800 dark:bg-zinc-200',
  },
  {
    key: 'content',
    aliases: ['content_writing', 'script', 'blog', 'copy', 'article'],
    label: 'Content Writing & Scripts',
    description: 'Scriptwriting, blogs, copy & caption drafting',
    icon: FileText,
    dotColor: 'bg-zinc-400 dark:bg-zinc-500',
    borderClass: 'border-l-zinc-400 dark:border-l-zinc-500',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    swatchClass: 'bg-zinc-400 dark:bg-zinc-500',
  },
];

/**
 * CategoryColorLegend Component
 * Renders a rich, interactive guide defining each board category code
 */
export const CategoryColorLegend = ({
  selectedCategory = 'all',
  onSelectCategory,
  title = 'Board Category Guide',
  description = 'Left-border shades identify deliverable & project categories at a glance',
  className = '',
  collapsible = true,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs space-y-2.5 transition-all ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
            <Palette size={13} />
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
            const isSelected =
              selectedCategory === item.key ||
              (item.aliases && item.aliases.includes(selectedCategory));
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
