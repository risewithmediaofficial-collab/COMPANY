// =============================================
// UNIFIED CATEGORY & THEME COLOR UTILITY
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
} from 'lucide-react';

/**
 * Standardized category color dictionary
 * Defines border accents, background tints, text colors, and badge classes
 */
export const CATEGORY_THEMES = {
  // Web & Engineering (Blue / Cyan)
  web_development: {
    key: 'web_development',
    label: 'Website / Web Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-blue-500 dark:border-l-blue-400',
    borderClass: 'border-blue-500/20',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    bgLight: 'bg-blue-500/5',
    text: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    colorName: 'blue',
  },
  web_design: {
    key: 'web_design',
    label: 'Web Design / UI-UX',
    shortLabel: 'Web Design',
    icon: Layout,
    accentBorder: 'border-l-cyan-500 dark:border-l-cyan-400',
    borderClass: 'border-cyan-500/20',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
    bgLight: 'bg-cyan-500/5',
    text: 'text-cyan-600 dark:text-cyan-400',
    dotClass: 'bg-cyan-500',
    colorName: 'cyan',
  },
  website_development: {
    key: 'website_development',
    label: 'Website Dev',
    shortLabel: 'Web Dev',
    icon: Globe,
    accentBorder: 'border-l-blue-500 dark:border-l-blue-400',
    borderClass: 'border-blue-500/20',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    bgLight: 'bg-blue-500/5',
    text: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    colorName: 'blue',
  },
  website_update: {
    key: 'website_update',
    label: 'Website Update',
    shortLabel: 'Web Update',
    icon: Globe,
    accentBorder: 'border-l-sky-500 dark:border-l-sky-400',
    borderClass: 'border-sky-500/20',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    bgLight: 'bg-sky-500/5',
    text: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
    colorName: 'sky',
  },
  landing_page: {
    key: 'landing_page',
    label: 'Landing Page',
    shortLabel: 'Landing Page',
    icon: Layout,
    accentBorder: 'border-l-cyan-500 dark:border-l-cyan-400',
    borderClass: 'border-cyan-500/20',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
    bgLight: 'bg-cyan-500/5',
    text: 'text-cyan-600 dark:text-cyan-400',
    dotClass: 'bg-cyan-500',
    colorName: 'cyan',
  },

  // Social Media & Marketing (Pink / Rose)
  social_media: {
    key: 'social_media',
    label: 'Social Media',
    shortLabel: 'Social Media',
    icon: Share2,
    accentBorder: 'border-l-pink-500 dark:border-l-pink-400',
    borderClass: 'border-pink-500/20',
    badgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
    bgLight: 'bg-pink-500/5',
    text: 'text-pink-600 dark:text-pink-400',
    dotClass: 'bg-pink-500',
    colorName: 'pink',
  },
  reel: {
    key: 'reel',
    label: 'Instagram Reel',
    shortLabel: 'Reel',
    icon: Film,
    accentBorder: 'border-l-pink-500 dark:border-l-pink-400',
    borderClass: 'border-pink-500/20',
    badgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
    bgLight: 'bg-pink-500/5',
    text: 'text-pink-600 dark:text-pink-400',
    dotClass: 'bg-pink-500',
    colorName: 'pink',
  },
  social_media_post: {
    key: 'social_media_post',
    label: 'Social Media Post',
    shortLabel: 'Post',
    icon: Share2,
    accentBorder: 'border-l-pink-500 dark:border-l-pink-400',
    borderClass: 'border-pink-500/20',
    badgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
    bgLight: 'bg-pink-500/5',
    text: 'text-pink-600 dark:text-pink-400',
    dotClass: 'bg-pink-500',
    colorName: 'pink',
  },
  poster: {
    key: 'poster',
    label: 'Poster / Creative',
    shortLabel: 'Poster',
    icon: Palette,
    accentBorder: 'border-l-violet-500 dark:border-l-violet-400',
    borderClass: 'border-violet-500/20',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    bgLight: 'bg-violet-500/5',
    text: 'text-violet-600 dark:text-violet-400',
    dotClass: 'bg-violet-500',
    colorName: 'violet',
  },

  // SEO & Search (Emerald / Green)
  seo: {
    key: 'seo',
    label: 'SEO & Search Marketing',
    shortLabel: 'SEO',
    icon: Search,
    accentBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    borderClass: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    bgLight: 'bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    colorName: 'emerald',
  },
  seo_work: {
    key: 'seo_work',
    label: 'SEO Optimization',
    shortLabel: 'SEO Work',
    icon: Search,
    accentBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    borderClass: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    bgLight: 'bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    colorName: 'emerald',
  },

  // Paid Ads & Performance (Amber / Orange)
  paid_ads: {
    key: 'paid_ads',
    label: 'Paid Ads / Performance',
    shortLabel: 'Paid Ads',
    icon: Target,
    accentBorder: 'border-l-amber-500 dark:border-l-amber-400',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    bgLight: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },
  ads_campaign: {
    key: 'ads_campaign',
    label: 'Ads Campaign Spend',
    shortLabel: 'Ads Spend',
    icon: Megaphone,
    accentBorder: 'border-l-amber-500 dark:border-l-amber-400',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    bgLight: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },
  ads_setup: {
    key: 'ads_setup',
    label: 'Ads Setup',
    shortLabel: 'Ads Setup',
    icon: Target,
    accentBorder: 'border-l-amber-500 dark:border-l-amber-400',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    bgLight: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },

  // Branding & Design (Purple / Violet)
  branding: {
    key: 'branding',
    label: 'Branding & Identity',
    shortLabel: 'Branding',
    icon: Sparkles,
    accentBorder: 'border-l-purple-500 dark:border-l-purple-400',
    borderClass: 'border-purple-500/20',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
    bgLight: 'bg-purple-500/5',
    text: 'text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500',
    colorName: 'purple',
  },
  graphic_design: {
    key: 'graphic_design',
    label: 'Graphic Design',
    shortLabel: 'Graphics',
    icon: Palette,
    accentBorder: 'border-l-violet-500 dark:border-l-violet-400',
    borderClass: 'border-violet-500/20',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    bgLight: 'bg-violet-500/5',
    text: 'text-violet-600 dark:text-violet-400',
    dotClass: 'bg-violet-500',
    colorName: 'violet',
  },

  // Video Production (Rose / Red)
  video_content: {
    key: 'video_content',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-rose-500 dark:border-l-rose-400',
    borderClass: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    bgLight: 'bg-rose-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    colorName: 'rose',
  },
  video: {
    key: 'video',
    label: 'Video Production',
    shortLabel: 'Video',
    icon: Video,
    accentBorder: 'border-l-rose-500 dark:border-l-rose-400',
    borderClass: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    bgLight: 'bg-rose-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    colorName: 'rose',
  },
  video_shoot: {
    key: 'video_shoot',
    label: 'Video Shoot Expense',
    shortLabel: 'Video Shoot',
    icon: Video,
    accentBorder: 'border-l-rose-500 dark:border-l-rose-400',
    borderClass: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    bgLight: 'bg-rose-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    colorName: 'rose',
  },

  // Mobile App (Teal)
  mobile_app: {
    key: 'mobile_app',
    label: 'Mobile App Development',
    shortLabel: 'Mobile App',
    icon: Smartphone,
    accentBorder: 'border-l-teal-500 dark:border-l-teal-400',
    borderClass: 'border-teal-500/20',
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    bgLight: 'bg-teal-500/5',
    text: 'text-teal-600 dark:text-teal-400',
    dotClass: 'bg-teal-500',
    colorName: 'teal',
  },

  // E-Commerce (Orange)
  e_commerce: {
    key: 'e_commerce',
    label: 'E-Commerce Solutions',
    shortLabel: 'E-Commerce',
    icon: ShoppingBag,
    accentBorder: 'border-l-orange-500 dark:border-l-orange-400',
    borderClass: 'border-orange-500/20',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
    bgLight: 'bg-orange-500/5',
    text: 'text-orange-600 dark:text-orange-400',
    dotClass: 'bg-orange-500',
    colorName: 'orange',
  },

  // SaaS & Platforms (Indigo)
  saas_product: {
    key: 'saas_product',
    label: 'SaaS Platform / Product',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-indigo-500 dark:border-l-indigo-400',
    borderClass: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    bgLight: 'bg-indigo-500/5',
    text: 'text-indigo-600 dark:text-indigo-400',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  saas: {
    key: 'saas',
    label: 'SaaS Platform',
    shortLabel: 'SaaS',
    icon: Rocket,
    accentBorder: 'border-l-indigo-500 dark:border-l-indigo-400',
    borderClass: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    bgLight: 'bg-indigo-500/5',
    text: 'text-indigo-600 dark:text-indigo-400',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  internal_tool: {
    key: 'internal_tool',
    label: 'Internal Software / Tool',
    shortLabel: 'Internal Tool',
    icon: Wrench,
    accentBorder: 'border-l-slate-500 dark:border-l-slate-400',
    borderClass: 'border-slate-500/20',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
    bgLight: 'bg-slate-500/5',
    text: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-500',
    colorName: 'slate',
  },

  // Finance / Salary / Tools
  salary: {
    key: 'salary',
    label: 'Salary & Payroll',
    shortLabel: 'Salary',
    icon: Banknote,
    accentBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    borderClass: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    bgLight: 'bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    colorName: 'emerald',
  },
  tools: {
    key: 'tools',
    label: 'Software & Tools',
    shortLabel: 'Tools & SaaS',
    icon: Wrench,
    accentBorder: 'border-l-indigo-500 dark:border-l-indigo-400',
    borderClass: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    bgLight: 'bg-indigo-500/5',
    text: 'text-indigo-600 dark:text-indigo-400',
    dotClass: 'bg-indigo-500',
    colorName: 'indigo',
  },
  office: {
    key: 'office',
    label: 'Office & Rent',
    shortLabel: 'Office',
    icon: Building,
    accentBorder: 'border-l-amber-500 dark:border-l-amber-400',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    bgLight: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    colorName: 'amber',
  },
  travel: {
    key: 'travel',
    label: 'Travel & Food',
    shortLabel: 'Travel',
    icon: ShoppingBag,
    accentBorder: 'border-l-orange-500 dark:border-l-orange-400',
    borderClass: 'border-orange-500/20',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
    bgLight: 'bg-orange-500/5',
    text: 'text-orange-600 dark:text-orange-400',
    dotClass: 'bg-orange-500',
    colorName: 'orange',
  },

  // Content (Sky)
  content: {
    key: 'content',
    label: 'Content Creation',
    shortLabel: 'Content',
    icon: FileText,
    accentBorder: 'border-l-sky-500 dark:border-l-sky-400',
    borderClass: 'border-sky-500/20',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    bgLight: 'bg-sky-500/5',
    text: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
    colorName: 'sky',
  },

  // Default / Other (Zinc)
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

  // Fallback heuristics
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
