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
 * Standardized monochrome black & grey category dictionary
 * Defines crisp grayscale left borders, neutral background tints, text colors, and badge classes
 */
export const CATEGORY_THEMES = {
  // Web & Engineering
  web_development: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  website: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  website_dev: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  web_design: {
    key: 'web_design',
    label: 'Web Design / UI-UX',
    shortLabel: 'Web Design',
    icon: Layout,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },
  website_development: {
    key: 'website_development',
    label: 'Website Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  website_update: {
    key: 'website_update',
    label: 'Website Update',
    shortLabel: 'Web Update',
    icon: Globe,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },
  landing_page: {
    key: 'landing_page',
    label: 'Landing Page',
    shortLabel: 'Landing Page',
    icon: Layout,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },

  // Social Media & Marketing
  social_media: {
    key: 'social_media',
    label: 'Social Media',
    shortLabel: 'Social Media',
    icon: Share2,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },
  reel: {
    key: 'reel',
    label: 'Instagram Reel',
    shortLabel: 'Reel',
    icon: Film,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  social_media_post: {
    key: 'social_media_post',
    label: 'Social Media Post',
    shortLabel: 'Post',
    icon: Share2,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },
  poster: {
    key: 'poster',
    label: 'Poster / Creative',
    shortLabel: 'Poster',
    icon: Palette,
    accentBorder: 'border-l-zinc-500 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
  },

  // SEO & Search
  seo: {
    key: 'seo',
    label: 'SEO & Search Marketing',
    shortLabel: 'SEO',
    icon: Search,
    accentBorder: 'border-l-neutral-700 dark:border-l-neutral-300',
    borderClass: 'border-neutral-500/25',
    badgeClass: 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/25',
    bgLight: 'bg-neutral-500/5',
    text: 'text-neutral-700 dark:text-neutral-300',
    dotClass: 'bg-neutral-700 dark:bg-neutral-300',
    colorName: 'neutral',
  },
  seo_work: {
    key: 'seo_work',
    label: 'SEO Optimization',
    shortLabel: 'SEO Work',
    icon: Search,
    accentBorder: 'border-l-neutral-700 dark:border-l-neutral-300',
    borderClass: 'border-neutral-500/25',
    badgeClass: 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/25',
    bgLight: 'bg-neutral-500/5',
    text: 'text-neutral-700 dark:text-neutral-300',
    dotClass: 'bg-neutral-700 dark:bg-neutral-300',
    colorName: 'neutral',
  },

  // Paid Ads & Performance
  paid_ads: {
    key: 'paid_ads',
    label: 'Paid Ads / Performance',
    shortLabel: 'Paid Ads',
    icon: Target,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  ads_campaign: {
    key: 'ads_campaign',
    label: 'Ads Campaign Spend',
    shortLabel: 'Ads Spend',
    icon: Megaphone,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  ads_setup: {
    key: 'ads_setup',
    label: 'Ads Setup',
    shortLabel: 'Ads Setup',
    icon: Target,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },

  // Branding & Design
  branding: {
    key: 'branding',
    label: 'Branding & Identity',
    shortLabel: 'Branding',
    icon: Sparkles,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },
  graphic_design: {
    key: 'graphic_design',
    label: 'Graphic Design',
    shortLabel: 'Graphics',
    icon: Palette,
    accentBorder: 'border-l-zinc-500 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
  },

  // Video Production
  video_content: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  video_production: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  video: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  video_shoot: {
    key: 'video_shoot',
    label: 'Video Shoot Expense',
    shortLabel: 'Video Shoot',
    icon: Video,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },

  // Mobile App
  mobile_app: {
    key: 'mobile_app',
    label: 'Mobile App Development',
    shortLabel: 'Mobile App',
    icon: Smartphone,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },

  // E-Commerce
  e_commerce: {
    key: 'e_commerce',
    label: 'E-Commerce Solutions',
    shortLabel: 'E-Commerce',
    icon: ShoppingBag,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },

  // SaaS & Platforms
  saas_product: {
    key: 'saas_product',
    label: 'SaaS Platform / Product',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  saas: {
    key: 'saas',
    label: 'SaaS Platform',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-800 dark:text-zinc-200',
    dotClass: 'bg-zinc-900 dark:bg-zinc-100',
    colorName: 'zinc',
  },
  internal_tool: {
    key: 'internal_tool',
    label: 'Internal Software / Tool',
    shortLabel: 'Internal Tool',
    icon: Wrench,
    accentBorder: 'border-l-zinc-500 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-600 dark:text-zinc-400',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
  },

  // Finance / Salary / Tools
  salary: {
    key: 'salary',
    label: 'Salary & Payroll',
    shortLabel: 'Salary',
    icon: Banknote,
    accentBorder: 'border-l-zinc-800 dark:border-l-zinc-200',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-800 dark:bg-zinc-200',
    colorName: 'zinc',
  },
  tools: {
    key: 'tools',
    label: 'Software & Tools',
    shortLabel: 'Tools & SaaS',
    icon: Wrench,
    accentBorder: 'border-l-zinc-700 dark:border-l-zinc-300',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-700 dark:bg-zinc-300',
    colorName: 'zinc',
  },
  office: {
    key: 'office',
    label: 'Office & Rent',
    shortLabel: 'Office',
    icon: Building,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },
  travel: {
    key: 'travel',
    label: 'Travel & Food',
    shortLabel: 'Travel',
    icon: ShoppingBag,
    accentBorder: 'border-l-zinc-500 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
  },

  // Content
  content: {
    key: 'content',
    label: 'Content Creation',
    shortLabel: 'Content',
    icon: FileText,
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    borderClass: 'border-zinc-500/25',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-600 dark:bg-zinc-400',
    colorName: 'zinc',
  },

  // Default / Other
  other: {
    key: 'other',
    label: 'Other / General',
    shortLabel: 'Other',
    icon: FolderKanban,
    accentBorder: 'border-l-zinc-400 dark:border-l-zinc-500',
    borderClass: 'border-zinc-500/20',
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-600 dark:text-zinc-400',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
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
    accentBorder: 'border-l-zinc-400 dark:border-l-zinc-500',
    borderClass: 'border-zinc-500/20',
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
    bgLight: 'bg-zinc-500/5',
    text: 'text-zinc-600 dark:text-zinc-400',
    dotClass: 'bg-zinc-500',
    colorName: 'zinc',
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
