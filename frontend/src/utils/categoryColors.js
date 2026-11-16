// =============================================
// UNIFIED CATEGORY & THEME COLOR UTILITY (MONOCHROME CRM)
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
  Receipt,
  Banknote,
  DollarSign,
  Megaphone,
  CreditCard,
  Building,
  Film,
  Layers,
} from '@/components/ui/muiIcons';

/**
 * Standardized category & deliverable dictionary with mild pastel accent colors
 * Defines mild pastel left borders, background tints, text colors, and badge classes
 */
export const CATEGORY_THEMES = {
  // Web & Engineering (Indigo)
  web_development: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  website: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  website_dev: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  web_design: {
    key: 'web_design',
    label: 'Web Design / UI-UX',
    shortLabel: 'Web Design',
    icon: Layout,
    accentBorder: 'border-l-indigo-400 dark:border-l-indigo-400',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-400',
    colorName: 'indigo',
  },
  website_development: {
    key: 'website_development',
    label: 'Website Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  website_update: {
    key: 'website_update',
    label: 'Website Update',
    shortLabel: 'Web Update',
    icon: Globe,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  landing_page: {
    key: 'landing_page',
    label: 'Landing Page',
    shortLabel: 'Landing Page',
    icon: Layout,
    accentBorder: 'border-l-indigo-500',
    borderClass: 'border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
    bgLight: 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]',
    text: 'text-indigo-700 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },

  // Social Media & Marketing (Cyan)
  social_media: {
    key: 'social_media',
    label: 'Social Media',
    shortLabel: 'Social Media',
    icon: Share2,
    accentBorder: 'border-l-cyan-500',
    borderClass: 'border-cyan-500/25',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25',
    bgLight: 'bg-cyan-500/[0.04] dark:bg-cyan-500/[0.08]',
    text: 'text-cyan-700 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
    colorName: 'cyan',
  },
  reel: {
    key: 'reel',
    label: 'Instagram Reel',
    shortLabel: 'Reel',
    icon: Film,
    accentBorder: 'border-l-rose-500',
    borderClass: 'border-rose-500/25',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25',
    bgLight: 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08]',
    text: 'text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    colorName: 'rose',
  },
  social_media_post: {
    key: 'social_media_post',
    label: 'Social Media Post',
    shortLabel: 'Post',
    icon: Share2,
    accentBorder: 'border-l-cyan-500',
    borderClass: 'border-cyan-500/25',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25',
    bgLight: 'bg-cyan-500/[0.04] dark:bg-cyan-500/[0.08]',
    text: 'text-cyan-700 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
    colorName: 'cyan',
  },
  poster: {
    key: 'poster',
    label: 'Poster / Creative',
    shortLabel: 'Poster',
    icon: Palette,
    accentBorder: 'border-l-violet-500',
    borderClass: 'border-violet-500/25',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25',
    bgLight: 'bg-violet-500/[0.04] dark:bg-violet-500/[0.08]',
    text: 'text-violet-700 dark:text-violet-300',
    dotClass: 'bg-violet-500',
    colorName: 'violet',
  },

  // SEO & Search (Emerald)
  seo: {
    key: 'seo',
    label: 'SEO & Search Marketing',
    shortLabel: 'SEO',
    icon: Search,
    accentBorder: 'border-l-emerald-500',
    borderClass: 'border-emerald-500/25',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
    bgLight: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]',
    text: 'text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    colorName: 'emerald',
  },
  seo_work: {
    key: 'seo_work',
    label: 'SEO Optimization',
    shortLabel: 'SEO Work',
    icon: Search,
    accentBorder: 'border-l-emerald-500',
    borderClass: 'border-emerald-500/25',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
    bgLight: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]',
    text: 'text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    colorName: 'emerald',
  },

  // Paid Ads & Performance (Amber)
  paid_ads: {
    key: 'paid_ads',
    label: 'Paid Ads / Performance',
    shortLabel: 'Paid Ads',
    icon: Target,
    accentBorder: 'border-l-amber-500',
    borderClass: 'border-amber-500/25',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25',
    bgLight: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    text: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },
  ads_campaign: {
    key: 'ads_campaign',
    label: 'Ads Campaign Spend',
    shortLabel: 'Ads Spend',
    icon: Megaphone,
    accentBorder: 'border-l-amber-500',
    borderClass: 'border-amber-500/25',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25',
    bgLight: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    text: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },
  ads_setup: {
    key: 'ads_setup',
    label: 'Ads Setup',
    shortLabel: 'Ads Setup',
    icon: Target,
    accentBorder: 'border-l-amber-500',
    borderClass: 'border-amber-500/25',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25',
    bgLight: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    text: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },

  // Branding & Design (Pink & Violet)
  branding: {
    key: 'branding',
    label: 'Branding & Identity',
    shortLabel: 'Branding',
    icon: Sparkles,
    accentBorder: 'border-l-pink-500',
    borderClass: 'border-pink-500/25',
    badgeClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/25',
    bgLight: 'bg-pink-500/[0.04] dark:bg-pink-500/[0.08]',
    text: 'text-pink-700 dark:text-pink-300',
    dotClass: 'bg-pink-500',
    colorName: 'pink',
  },
  graphic_design: {
    key: 'graphic_design',
    label: 'Graphic Design',
    shortLabel: 'Graphics',
    icon: Palette,
    accentBorder: 'border-l-violet-500',
    borderClass: 'border-violet-500/25',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25',
    bgLight: 'bg-violet-500/[0.04] dark:bg-violet-500/[0.08]',
    text: 'text-violet-700 dark:text-violet-300',
    dotClass: 'bg-violet-500',
    colorName: 'violet',
  },

  // Video Production (Red & Rose)
  video_content: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-red-500',
    borderClass: 'border-red-500/25',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25',
    bgLight: 'bg-red-500/[0.04] dark:bg-red-500/[0.08]',
    text: 'text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500',
    colorName: 'red',
  },
  video_production: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-red-500',
    borderClass: 'border-red-500/25',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25',
    bgLight: 'bg-red-500/[0.04] dark:bg-red-500/[0.08]',
    text: 'text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500',
    colorName: 'red',
  },
  video: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-red-500',
    borderClass: 'border-red-500/25',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25',
    bgLight: 'bg-red-500/[0.04] dark:bg-red-500/[0.08]',
    text: 'text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500',
    colorName: 'red',
  },
  video_shoot: {
    key: 'video_shoot',
    label: 'Video Shoot Expense',
    shortLabel: 'Video Shoot',
    icon: Video,
    accentBorder: 'border-l-red-500',
    borderClass: 'border-red-500/25',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25',
    bgLight: 'bg-red-500/[0.04] dark:bg-red-500/[0.08]',
    text: 'text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500',
    colorName: 'red',
  },

  // Mobile App (Sky)
  mobile_app: {
    key: 'mobile_app',
    label: 'Mobile App Development',
    shortLabel: 'Mobile App',
    icon: Smartphone,
    accentBorder: 'border-l-sky-500',
    borderClass: 'border-sky-500/25',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25',
    bgLight: 'bg-sky-500/[0.04] dark:bg-sky-500/[0.08]',
    text: 'text-sky-700 dark:text-sky-300',
    dotClass: 'bg-sky-500',
    colorName: 'sky',
  },

  // E-Commerce (Orange)
  e_commerce: {
    key: 'e_commerce',
    label: 'E-Commerce Solutions',
    shortLabel: 'E-Commerce',
    icon: ShoppingBag,
    accentBorder: 'border-l-orange-500',
    borderClass: 'border-orange-500/25',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25',
    bgLight: 'bg-orange-500/[0.04] dark:bg-orange-500/[0.08]',
    text: 'text-orange-700 dark:text-orange-300',
    dotClass: 'bg-orange-500',
    colorName: 'orange',
  },

  // SaaS & Platforms (Purple)
  saas_product: {
    key: 'saas_product',
    label: 'SaaS Platform / Product',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-purple-500',
    borderClass: 'border-purple-500/25',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25',
    bgLight: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.08]',
    text: 'text-purple-700 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    colorName: 'purple',
  },
  saas: {
    key: 'saas',
    label: 'SaaS Platform',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-purple-500',
    borderClass: 'border-purple-500/25',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25',
    bgLight: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.08]',
    text: 'text-purple-700 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    colorName: 'purple',
  },
  internal_tool: {
    key: 'internal_tool',
    label: 'Internal Software / Tool',
    shortLabel: 'Internal Tool',
    icon: Wrench,
    accentBorder: 'border-l-purple-400',
    borderClass: 'border-purple-500/25',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25',
    bgLight: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.08]',
    text: 'text-purple-700 dark:text-purple-300',
    dotClass: 'bg-purple-400',
    colorName: 'purple',
  },

  // Finance / Salary / Tools (Emerald, Blue, Amber, Teal)
  salary: {
    key: 'salary',
    label: 'Salary & Payroll',
    shortLabel: 'Salary',
    icon: Banknote,
    accentBorder: 'border-l-emerald-600',
    borderClass: 'border-emerald-600/25',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/25',
    bgLight: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]',
    text: 'text-emerald-800 dark:text-emerald-200',
    dotClass: 'bg-emerald-600',
    colorName: 'emerald',
  },
  tools: {
    key: 'tools',
    label: 'Software & Tools',
    shortLabel: 'Tools & SaaS',
    icon: Wrench,
    accentBorder: 'border-l-blue-500',
    borderClass: 'border-blue-500/25',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25',
    bgLight: 'bg-blue-500/[0.04] dark:bg-blue-500/[0.08]',
    text: 'text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    colorName: 'blue',
  },
  office: {
    key: 'office',
    label: 'Office & Rent',
    shortLabel: 'Office',
    icon: Building,
    accentBorder: 'border-l-amber-600',
    borderClass: 'border-amber-600/25',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25',
    bgLight: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    text: 'text-amber-800 dark:text-amber-200',
    dotClass: 'bg-amber-600',
    colorName: 'amber',
  },
  travel: {
    key: 'travel',
    label: 'Travel & Food',
    shortLabel: 'Travel',
    icon: ShoppingBag,
    accentBorder: 'border-l-teal-500',
    borderClass: 'border-teal-500/25',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25',
    bgLight: 'bg-teal-500/[0.04] dark:bg-teal-500/[0.08]',
    text: 'text-teal-700 dark:text-teal-300',
    dotClass: 'bg-teal-500',
    colorName: 'teal',
  },

  // Content (Cyan)
  content: {
    key: 'content',
    label: 'Content Creation',
    shortLabel: 'Content',
    icon: FileText,
    accentBorder: 'border-l-cyan-600',
    borderClass: 'border-cyan-600/25',
    badgeClass: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/25',
    bgLight: 'bg-cyan-500/[0.04] dark:bg-cyan-500/[0.08]',
    text: 'text-cyan-800 dark:text-cyan-200',
    dotClass: 'bg-cyan-600',
    colorName: 'cyan',
  },

  // Default / Other (Slate)
  other: {
    key: 'other',
    label: 'Other / General',
    shortLabel: 'Other',
    icon: FolderKanban,
    accentBorder: 'border-l-slate-400 dark:border-l-slate-500',
    borderClass: 'border-slate-500/20',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/25',
    bgLight: 'bg-slate-500/[0.04] dark:bg-slate-500/[0.08]',
    text: 'text-slate-700 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    colorName: 'slate',
  },
};

/**
 * Returns normalized category styling for any category or task type key
 */
export const getCategoryTheme = (rawKey) => {
  if (!rawKey) return CATEGORY_THEMES.other;

  const normalized = String(rawKey).toLowerCase().trim().replace(/[-\s]+/g, '_');

  if (CATEGORY_THEMES[normalized]) {
    return CATEGORY_THEMES[normalized];
  }

  if (normalized.includes('web') || normalized.includes('site') || normalized.includes('frontend') || normalized.includes('backend')) {
    return CATEGORY_THEMES.web_development;
  }
  if (normalized.includes('social') || normalized.includes('smm') || normalized.includes('instagram') || normalized.includes('reel') || normalized.includes('post')) {
    return CATEGORY_THEMES.social_media;
  }
  if (normalized.includes('seo') || normalized.includes('keyword') || normalized.includes('rank')) {
    return CATEGORY_THEMES.seo;
  }
  if (normalized.includes('ad') || normalized.includes('campaign') || normalized.includes('ppc') || normalized.includes('meta')) {
    return CATEGORY_THEMES.paid_ads;
  }
  if (normalized.includes('brand') || normalized.includes('logo') || normalized.includes('identity')) {
    return CATEGORY_THEMES.branding;
  }
  if (normalized.includes('design') || normalized.includes('graphic') || normalized.includes('poster')) {
    return CATEGORY_THEMES.graphic_design;
  }
  if (normalized.includes('video') || normalized.includes('shoot') || normalized.includes('edit') || normalized.includes('motion')) {
    return CATEGORY_THEMES.video_content;
  }
  if (normalized.includes('app') || normalized.includes('mobile') || normalized.includes('flutter') || normalized.includes('react_native')) {
    return CATEGORY_THEMES.mobile_app;
  }
  if (normalized.includes('commerce') || normalized.includes('store') || normalized.includes('shop')) {
    return CATEGORY_THEMES.e_commerce;
  }
  if (normalized.includes('saas') || normalized.includes('software') || normalized.includes('cloud') || normalized.includes('tool')) {
    return CATEGORY_THEMES.saas_product;
  }
  if (normalized.includes('salary') || normalized.includes('payroll') || normalized.includes('wage')) {
    return CATEGORY_THEMES.salary;
  }
  if (normalized.includes('rent') || normalized.includes('office') || normalized.includes('infra')) {
    return CATEGORY_THEMES.office;
  }
  if (normalized.includes('travel') || normalized.includes('fuel') || normalized.includes('food')) {
    return CATEGORY_THEMES.travel;
  }
  if (normalized.includes('content') || normalized.includes('blog') || normalized.includes('copy') || normalized.includes('script')) {
    return CATEGORY_THEMES.content;
  }

  const customLabel = String(rawKey)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    key: normalized,
    label: customLabel,
    shortLabel: customLabel,
    icon: FolderKanban,
    accentBorder: 'border-l-slate-400 dark:border-l-slate-500',
    borderClass: 'border-slate-500/20',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/25',
    bgLight: 'bg-slate-500/[0.04] dark:bg-slate-500/[0.08]',
    text: 'text-slate-700 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    colorName: 'slate',
  };
};

/**
 * Universal category & deliverable filter matcher
 * Handles aliased keys, composite keys, substrings, and metadata mapping
 */
export const isCategoryMatch = (itemCategoryOrType, filterKey, itemTitle = '') => {
  if (!filterKey || filterKey === 'all') return true;

  const rawKey = String(itemCategoryOrType || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
  const title = String(itemTitle || '').toLowerCase();
  const filter = String(filterKey).toLowerCase().trim().replace(/[-\s]+/g, '_');

  if (rawKey === filter) return true;

  if (['web_development', 'website', 'web_design', 'web', 'website_development', 'website_update', 'landing_page', 'website_dev'].includes(filter)) {
    return (
      rawKey.includes('web') ||
      rawKey.includes('site') ||
      rawKey.includes('landing') ||
      rawKey.includes('domain') ||
      rawKey.includes('hosting') ||
      rawKey.includes('frontend') ||
      rawKey.includes('backend') ||
      title.includes('website') ||
      title.includes('web dev') ||
      title.includes('landing page') ||
      title.includes('web app')
    );
  }

  if (['social_media', 'social_media_post', 'social', 'smm', 'instagram', 'facebook', 'post'].includes(filter)) {
    return (
      rawKey.includes('social') ||
      rawKey.includes('smm') ||
      rawKey.includes('instagram') ||
      rawKey.includes('post') ||
      rawKey.includes('story') ||
      rawKey.includes('carousel') ||
      rawKey.includes('reel') ||
      rawKey.includes('short')
    );
  }

  if (['reel', 'shorts', 'short'].includes(filter)) {
    return rawKey.includes('reel') || rawKey.includes('short') || title.includes('reel') || title.includes('short');
  }

  if (['video_content', 'video_production', 'video', 'video_shoot', 'youtube', 'shoot'].includes(filter)) {
    return (
      rawKey.includes('video') ||
      rawKey.includes('shoot') ||
      rawKey.includes('film') ||
      rawKey.includes('youtube') ||
      rawKey.includes('motion') ||
      title.includes('video') ||
      title.includes('shoot')
    );
  }

  if (['branding', 'poster', 'graphic_design', 'design', 'logo'].includes(filter)) {
    return (
      rawKey.includes('brand') ||
      rawKey.includes('design') ||
      rawKey.includes('graphic') ||
      rawKey.includes('poster') ||
      rawKey.includes('logo') ||
      rawKey.includes('identity') ||
      rawKey.includes('creative')
    );
  }

  if (['paid_ads', 'ads_campaign', 'ads', 'ads_setup', 'ad_creative', 'meta_ads', 'google_ads', 'ppc'].includes(filter)) {
    return (
      rawKey.includes('ad') ||
      rawKey.includes('campaign') ||
      rawKey.includes('ppc') ||
      rawKey.includes('meta') ||
      title.includes('ad') ||
      title.includes('campaign')
    );
  }

  if (['seo', 'seo_work', 'search'].includes(filter)) {
    return (
      rawKey.includes('seo') ||
      rawKey.includes('search') ||
      rawKey.includes('keyword') ||
      rawKey.includes('rank') ||
      rawKey.includes('backlink') ||
      title.includes('seo')
    );
  }

  if (['saas_product', 'saas', 'internal_tool', 'internal_product', 'software', 'platform', 'crm', 'app', 'mobile_app'].includes(filter)) {
    return (
      rawKey.includes('saas') ||
      rawKey.includes('software') ||
      rawKey.includes('tool') ||
      rawKey.includes('product') ||
      rawKey.includes('platform') ||
      rawKey.includes('crm') ||
      rawKey.includes('portal') ||
      rawKey.includes('app') ||
      title.includes('saas') ||
      title.includes('crm') ||
      title.includes('software') ||
      title.includes('app')
    );
  }

  if (['content', 'content_writing', 'script', 'blog', 'copy', 'article'].includes(filter)) {
    return (
      rawKey.includes('content') ||
      rawKey.includes('script') ||
      rawKey.includes('blog') ||
      rawKey.includes('copy') ||
      rawKey.includes('write') ||
      rawKey.includes('article') ||
      rawKey.includes('caption') ||
      title.includes('script') ||
      title.includes('content') ||
      title.includes('blog')
    );
  }

  const itemTheme = getCategoryTheme(itemCategoryOrType).key;
  const filterTheme = getCategoryTheme(filterKey).key;
  return itemTheme === filterTheme || rawKey.includes(filter) || filter.includes(rawKey);
};
