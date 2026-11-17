import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Sparkles,
  Zap,
  Rocket,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Star,
  Layers,
  Briefcase,
  X,
  ArrowRight,
  TrendingUp,
  Heart,
} from '@/components/ui/muiIcons';
import api from '@/api';

const EXCLUDED_ROLES = ['superAdmin', 'admin', 'manager'];
const ALLOWED_ROLES = ['employee', 'intern', 'client'];

export default function OnboardingWelcomeModal() {
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    // 1. Strictly exclude superAdmin, admin, and manager
    if (EXCLUDED_ROLES.includes(user.role) || !ALLOWED_ROLES.includes(user.role)) {
      return;
    }

    const storageKey = `rwm_welcome_seen_${user._id}`;
    const alreadySeenLocal = localStorage.getItem(storageKey) === 'true';
    const alreadySeenSession = sessionStorage.getItem(storageKey) === 'true';
    const alreadySeenRemote = Boolean(user.hasSeenOnboarding);

    // 2. If already completed/seen in local, session, or remote database, do not show
    if (alreadySeenLocal || alreadySeenSession || alreadySeenRemote) {
      return;
    }

    // 3. 1st time login only (existing users do not need this)
    if (user.isFirstLogin === false) {
      localStorage.setItem(storageKey, 'true');
      return;
    }

    // If account was created more than 2 days ago and not explicitly flagged as first-time login, skip
    if (user.createdAt) {
      const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays > 2 && user.isFirstLogin !== true) {
        localStorage.setItem(storageKey, 'true');
        return;
      }
    }

    // Small 700ms delay so page loads cleanly before the sticker modal pops in
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem(storageKey, 'true');
    }, 700);

    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = async () => {
    if (!user?._id) {
      setIsOpen(false);
      return;
    }
    const storageKey = `rwm_welcome_seen_${user._id}`;
    localStorage.setItem(storageKey, 'true');
    sessionStorage.setItem(storageKey, 'true');

    setIsClosing(true);
    try {
      await api.post('/auth/complete-onboarding');
    } catch (err) {
      console.warn('Could not persist onboarding state:', err);
    }

    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen || !user || EXCLUDED_ROLES.includes(user.role) || !ALLOWED_ROLES.includes(user.role)) return null;

  const role = user.role || 'employee';
  const firstName = (user.name || 'Friend').split(' ')[0];

  // Role-based sticker content
  let config = {
    badge: 'OFFICIAL TEAM MEMBER ⚡',
    badgeBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    title: `Welcome to the Crew, ${firstName}! 🚀`,
    tagline: 'High energy, high standards, and continuous growth.',
    message:
      'We are thrilled to have your craft and energy with us. RiseWithMedia is built on creative courage, rapid execution, and ownership. You are equipped with everything you need to do the best work of your career.',
    stickers: [
      {
        icon: Zap,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        title: 'Daily Department SOPs',
        desc: 'Follow your department’s daily standard procedures for reliable, consistent excellence.',
      },
      {
        icon: FileText,
        color: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
        title: 'Compulsory Daily EOD',
        desc: 'Submit your End-of-Day report before clocking out — documenting daily wins moves everyone forward.',
      },
      {
        icon: TrendingUp,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        title: 'Ownership & Impact',
        desc: 'Take initiative, collaborate transparently across teams, and celebrate every milestone.',
      },
    ],
    cta: "Let's Crush It! ⚡",
  };

  if (role === 'intern') {
    config = {
      badge: 'RISING STAR & INTERN 🌟',
      badgeBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40',
      title: `Welcome to the Launchpad, ${firstName}! ✨`,
      tagline: 'Learn fast, build real projects, and make your mark.',
      message:
        'This internship is designed to give you real hands-on experience on live client projects. We value curiosity, enthusiasm, and fresh ideas. Don’t be afraid to ask questions — your mentors are here to help you shine!',
      stickers: [
        {
          icon: Zap,
          color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
          title: 'Daily SOP Checklist',
          desc: 'Use your department daily SOP as your roadmap every morning to stay organized and sharp.',
        },
        {
          icon: FileText,
          color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
          title: 'Daily EOD Report (Compulsory)',
          desc: 'Submit your daily learnings and task progress every evening — this helps mentors give timely feedback.',
        },
        {
          icon: Sparkles,
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
          title: 'Ask Questions & Experiment',
          desc: 'Curiosity is rewarded here. Dive in, learn the tools, and build a portfolio you will be proud of.',
        },
      ],
      cta: 'Ready to Learn & Launch! 🚀',
    };
  } else if (role === 'client') {
    config = {
      badge: 'VIP CLIENT PARTNER ⭐',
      badgeBg: 'bg-primary/20 text-primary border-primary/40',
      title: `Welcome to Your Client Portal, ${firstName}! 🎉`,
      tagline: 'Complete transparency, live deliverables, and seamless communication.',
      message:
        'Thank you for partnering with RiseWithMedia! We are excited to elevate your brand. This portal is your dedicated command center where you can view live project progress, track daily tasks, download invoices & proposals, and access your credentials anytime.',
      stickers: [
        {
          icon: Layers,
          color: 'text-primary bg-primary/10 border-primary/30',
          title: 'Live Projects & Daily Tasks',
          desc: 'See exactly what our team is working on right now, with real-time progress and milestone updates.',
        },
        {
          icon: TrendingUp,
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
          title: 'Invoices & Financial Summary',
          desc: 'Track individual project payments, receipts, and pending amounts with complete financial clarity.',
        },
        {
          icon: ShieldCheck,
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
          title: 'Dedicated Credentials Vault',
          desc: 'Securely retrieve logins, assets, and service credentials shared specifically with your account.',
        },
      ],
      cta: 'Explore My Portal 🚀',
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-lg sm:max-w-xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden transition-all transform ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Playful Floating Sticker Accents */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-primary/30 via-pink-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-gradient-to-tr from-amber-500/20 via-primary/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shadow-xs border border-border/40"
          aria-label="Close welcome message"
        >
          <X size={16} />
        </button>

        {/* Sticker Header */}
        <div className="relative p-6 sm:p-7 pb-4">
          {/* Holographic Sticker Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-xs transform -rotate-1 hover:rotate-0 transition-transform mb-3 select-none ${config.badgeBg}">
            <Sparkles size={13} className="animate-spin duration-1000" />
            <span>{config.badge}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
            {config.title}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
            {config.tagline}
          </p>

          <p className="text-xs sm:text-sm text-muted-foreground mt-3 leading-relaxed">
            {config.message}
          </p>
        </div>

        {/* Sticker Cards List */}
        <div className="px-6 sm:px-7 space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
          {config.stickers.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/40 transition-all group"
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105 ${item.color}`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with CTA Sticker Button */}
        <div className="p-6 sm:p-7 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40 bg-card/60 mt-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Heart size={14} className="text-primary" />
            <span>RiseWithMedia Agency OS</span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:opacity-95 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>{config.cta}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
