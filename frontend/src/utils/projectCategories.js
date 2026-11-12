// =============================================
// PROJECT CATEGORY DEFINITIONS & METADATA (MONOCHROME CRM)
// =============================================

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
} from '@/components/ui/muiIcons';
import { getCategoryTheme } from './categoryColors';

const MONO_BADGE = 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25';

export const PROJECT_CATEGORIES = {
  web_development: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    group: 'Engineering',
  },
  web_design: {
    key: 'web_design',
    label: 'Web Design / UI-UX',
    shortLabel: 'Web Design',
    icon: Layout,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    group: 'Design',
  },
  social_media: {
    key: 'social_media',
    label: 'Social Media Marketing',
    shortLabel: 'Social Media',
    icon: Share2,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    group: 'Marketing',
  },
  seo: {
    key: 'seo',
    label: 'SEO & Search Marketing',
    shortLabel: 'SEO',
    icon: Search,
    color: 'neutral',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-neutral-600 dark:bg-neutral-400',
    group: 'Marketing',
  },
  paid_ads: {
    key: 'paid_ads',
    label: 'Paid Ads / Performance',
    shortLabel: 'Paid Ads',
    icon: Target,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    group: 'Marketing',
  },
  branding: {
    key: 'branding',
    label: 'Branding & Identity',
    shortLabel: 'Branding',
    icon: Sparkles,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    group: 'Design',
  },
  graphic_design: {
    key: 'graphic_design',
    label: 'Graphic Design',
    shortLabel: 'Graphics',
    icon: Palette,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-500',
    group: 'Design',
  },
  video_content: {
    key: 'video_content',
    label: 'Video Production & Content',
    shortLabel: 'Video',
    icon: Video,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    group: 'Media',
  },
  video: {
    key: 'video',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    group: 'Media',
  },
  mobile_app: {
    key: 'mobile_app',
    label: 'Mobile App Development',
    shortLabel: 'Mobile App',
    icon: Smartphone,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    group: 'Engineering',
  },
  e_commerce: {
    key: 'e_commerce',
    label: 'E-Commerce Solutions',
    shortLabel: 'E-Commerce',
    icon: ShoppingBag,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    group: 'Engineering',
  },
  saas_product: {
    key: 'saas_product',
    label: 'SaaS Product / Platform',
    shortLabel: 'SaaS',
    icon: Rocket,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    group: 'Product',
  },
  saas: {
    key: 'saas',
    label: 'SaaS Product',
    shortLabel: 'SaaS',
    icon: Rocket,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    group: 'Product',
  },
  internal_tool: {
    key: 'internal_tool',
    label: 'Internal Software / Tool',
    shortLabel: 'Internal Tool',
    icon: Wrench,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-500',
    group: 'Product',
  },
  internal_product: {
    key: 'internal_product',
    label: 'Internal Product',
    shortLabel: 'Internal Product',
    icon: Wrench,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-500',
    group: 'Product',
  },
  content: {
    key: 'content',
    label: 'Content Creation',
    shortLabel: 'Content',
    icon: FileText,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    group: 'Marketing',
  },
  other: {
    key: 'other',
    label: 'Other Services',
    shortLabel: 'Other',
    icon: FolderKanban,
    color: 'zinc',
    badgeClass: MONO_BADGE,
    dotClass: 'bg-zinc-500',
    group: 'General',
  },
};

/**
 * Returns normalized category metadata for any given category string
 */
export const getProjectCategoryMeta = (categoryKey) => {
  return getCategoryTheme(categoryKey);
};

/**
 * Clean options list for Dropdowns and Select components
 */
export const CATEGORY_OPTIONS = [
  { value: 'web_development', label: 'Website / Web Development' },
  { value: 'web_design', label: 'Web Design / UI-UX' },
  { value: 'social_media', label: 'Social Media Marketing' },
  { value: 'seo', label: 'Search Engine Optimization (SEO)' },
  { value: 'paid_ads', label: 'Paid Ads & Performance Marketing' },
  { value: 'branding', label: 'Branding & Identity' },
  { value: 'graphic_design', label: 'Graphic Design & Creatives' },
  { value: 'video_content', label: 'Video Production & Content' },
  { value: 'mobile_app', label: 'Mobile App Development' },
  { value: 'e_commerce', label: 'E-Commerce Solutions' },
  { value: 'saas_product', label: 'SaaS Product / Platform' },
  { value: 'internal_tool', label: 'Internal Software / Tool' },
  { value: 'content', label: 'Content Creation & Copywriting' },
  { value: 'other', label: 'Other Services' },
];

/**
 * Filter pills list for quick 1-click filtering
 */
export const CATEGORY_FILTER_PILLS = [
  { key: 'all', label: 'All Projects', icon: FolderKanban },
  { key: 'web_development', label: 'Website / Dev', icon: Globe },
  { key: 'web_design', label: 'Web Design', icon: Layout },
  { key: 'social_media', label: 'Social Media', icon: Share2 },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'paid_ads', label: 'Paid Ads', icon: Target },
  { key: 'branding', label: 'Branding', icon: Sparkles },
  { key: 'graphic_design', label: 'Graphic Design', icon: Palette },
  { key: 'video_content', label: 'Video', icon: Video },
  { key: 'mobile_app', label: 'Mobile App', icon: Smartphone },
  { key: 'e_commerce', label: 'E-Commerce', icon: ShoppingBag },
  { key: 'saas_product', label: 'SaaS Product', icon: Rocket },
  { key: 'internal_tool', label: 'Internal Tool', icon: Wrench },
  { key: 'content', label: 'Content', icon: FileText },
  { key: 'other', label: 'Other', icon: FolderKanban },
];
