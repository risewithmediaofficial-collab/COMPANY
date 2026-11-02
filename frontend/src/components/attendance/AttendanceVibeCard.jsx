import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Target,
  Trophy,
  Clock,
  Shuffle,
  Copy,
  Check,
  Lock,
  Smile,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Crazy Tanglish Meme Stickers and Dialogue Catalog
 * Grouped into 4 timing tiers:
 * 1. early: Clock in < 09:25 AM
 * 2. sharp: Clock in 09:25 AM - 09:33 AM (Dot 9:30 AM)
 * 3. late:  Clock in 09:34 AM - 11:30 AM
 * 4. afternoon: Clock in > 11:30 AM (Second Half / Guest Appearance)
 */
const VIBE_TIERS = {
  early: {
    categoryLabel: '👑 Early Bird / Shutter Thirappavargal',
    badgeTheme: 'from-emerald-500/20 via-teal-500/15 to-amber-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    headerBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    avatarEmoji: '👑',
    glowColor: 'bg-emerald-500/10',
    meter: '⚡ Over-Dedication Level: 9999% • Salary-la Extra ₹10 Sethu Podunga Sir!',
    items: [
      {
        title: 'OFFICE KEY UN KITA THAANA IRUKKU?!',
        punch: 'Tea kadai anna kooda innum aduppu patha vekkala bro... Shutter open panna night-ey ingaye tent potu paduthutiya?! 🔥',
        subtext: 'Innum fan switch kooda podala, nee work start pannita! Mass VIP early entry!',
      },
      {
        title: 'VELAIKARAN ILLA... VIYARVAI THALAIVAN!',
        punch: 'Innum office bulb kooda muzhikkala... Un speed paathu server-ey shock aagi load aagudhu! Appraisal-la 100% hike confirm!',
        subtext: 'First punch of the day! RiseWithMedia-vin muthal kural 🚀',
      },
      {
        title: 'COMPANY OWNER-A NEE?!',
        punch: 'Manager veetla innum brush pannitu irukkaru, nee inga report ready panriya?! Over-enthusiastic bird sir neenga!',
        subtext: 'Security anna kitta irundhu saaviya vaangura mudhal aal! Dedicated level unbeatable!',
      },
      {
        title: 'KADAVULE AJITHEYY... EVLO SEEKIRAM?!',
        punch: 'Alarm adikkardhukku munnaadiye alarm-aye elupi vittutu vandhutaan polaye! Early login-la record break!',
        subtext: 'No traffic, no tension, pure royal mass entry! 😎',
      },
    ],
  },
  sharp: {
    categoryLabel: '🎯 Sharp 9:30 AM / Dot-La Master',
    badgeTheme: 'from-cyan-500/20 via-blue-500/15 to-indigo-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400',
    headerBadge: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    avatarEmoji: '🎯',
    glowColor: 'bg-cyan-500/10',
    meter: '🎯 Sniper Accuracy: 99.9% • HR-ke Thannaale Salute Varum Moment!',
    items: [
      {
        title: 'DOT-LA MASTER (9:29:59 SNIPER)',
        punch: 'Naan eppo varuven, epdi varuven-nu theriyadhu... Aana 9:30-ku dot-a biometric-la kai veppen!',
        subtext: 'Padikadhavan Dhanush speed-la millisecond timing punch! Mass kaatita thalaiva!',
      },
      {
        title: 'ROLEX SIR TIMING... SHARP ENTRY!',
        punch: '1 Second miss aana HR half-day potruvaangannu therinju pota master stroke! Atomic clock-eh un kitta thaan time kekkum போல!',
        subtext: 'Thala pola varuma! Oru nodi munnum illa, pinnum illa... Absolute accuracy!',
      },
      {
        title: 'BIOMETRIC BULLET PANDI',
        punch: '9:29:58-ku lift vittu erangi, 9:29:59-ku finger vechu, 9:30:00-ku seat-la water bottle vecha legend!',
        subtext: 'Formula 1 pit stop timing! Speed-um mass-um un kitta thaan padikkanum! ⚡',
      },
      {
        title: 'SYSTEM-EY CONFUSE AANA ENTRY',
        punch: '9:30 dot timing paathu attendance machine-ey "Dei ivan manushan thaana" nu yosikkudhu!',
        subtext: 'Idhudhaan da perfect balance! System crash aagura sharp timing!',
      },
    ],
  },
  late: {
    categoryLabel: '🐢 Traffic Thalapathy / Vadivelu Mode',
    badgeTheme: 'from-amber-500/20 via-orange-500/15 to-rose-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400',
    headerBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    avatarEmoji: '🐢',
    glowColor: 'bg-amber-500/10',
    meter: '🚨 Risk Factor: 95% • Boss Paakaradhukulla Monitor-la Excel Open Pannu!',
    items: [
      {
        title: 'TRAFFIC THALAPATHY (SIGNAL-LA AADU)',
        punch: 'Alarm adichuchu... naan adha thirumba adichen! Boss, adhu traffic illa, signal-la aadu maatikituchu!',
        subtext: 'Ready-made excuses loaded: Train late, tyre puncture, road block! Monitor-a paathu serious-a thalaya aatidu!',
      },
      {
        title: 'VADIVELU ESCAPE: IPPO THAAN VANDHEN!',
        punch: 'Ippo thaan vandhen boss, amaidhiya stealth ninja-va seat-la ukkandha yaarum kandupikka maattanga... Ninja technique!',
        subtext: 'Manager pakkathula varra varaikkum code editor screen-a full zoom panni veyyi! 🤫',
      },
      {
        title: 'ALARM-EH EMATHTHIYA VEERAN',
        punch: '5 Minutes snooze pannen bro, kan muzhichu paatha 1 hour aayiduchu! Time machine kandupudichadhey namma thaan!',
        subtext: 'Late-a vandhalum latest-a vandhom! Tea break appo compensation panniruvom! ☕',
      },
      {
        title: 'MASS SLOW MOTION ENTRY',
        punch: 'Singam eppovume kootama varadhu, late-a thaan varum... Aana vandha vettai aaduradha yaarum thadukka mudiyadhu!',
        subtext: 'HR room pakkam thala vachu paduthuradha! Straight-a desk-ku escape aagu!',
      },
    ],
  },
  afternoon: {
    categoryLabel: '🎬 Second Half Hero / Guest Appearance',
    badgeTheme: 'from-purple-500/20 via-fuchsia-500/15 to-pink-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400',
    headerBadge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
    avatarEmoji: '🎬',
    glowColor: 'bg-purple-500/10',
    meter: '🌟 Interval Block Scene • Half Day Aana Enna, Full Mass Energy!',
    items: [
      {
        title: 'SECOND HALF HERO / GUEST ENTRY',
        punch: 'Padathula interval-ku aprom thaan main character entry aagum! Lunch sapda vandhiya illa vela paaka vandhiya bro?!',
        subtext: 'Climax scene namma thaan carry panna porom! Post-lunch energy booster!',
      },
      {
        title: 'LUNCH SPECIAL CHIEF GUEST',
        punch: 'Morning show miss aachu, matinee show hit pannuvom! Straight-a cafeteria poyittu laptop open pannu!',
        subtext: 'Guest of honour for today\'s shift! Mass arrival! 🥪',
      },
      {
        title: 'PAN-INDIAN VIP ENTRY',
        punch: 'Appadithaan varuven... Late-a vandhalum climax scene namma thaan dominate panrom! Mass VIP entry!',
        subtext: 'HR room pakkam pogaama stealth radar-la bypass panni vandha spy agent! 🕶️',
      },
    ],
  },
};

/**
 * Determines timing tier from clock-in timestamp:
 * < 09:25: early
 * 09:25 - 09:33: sharp (Dot 9:30)
 * 09:34 - 11:30: late
 * > 11:30: afternoon
 */
const getTimingTier = (clockInDate) => {
  if (!clockInDate || isNaN(clockInDate.getTime())) return 'sharp';
  const hours = clockInDate.getHours();
  const minutes = clockInDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Before 09:25 AM
  if (totalMinutes < 9 * 60 + 25) {
    return 'early';
  }
  // 09:25 AM to 09:33 AM (Dot 9:30 AM window)
  if (totalMinutes <= 9 * 60 + 33) {
    return 'sharp';
  }
  // 09:34 AM to 11:30 AM
  if (totalMinutes <= 11 * 60 + 30) {
    return 'late';
  }
  // Afternoon / Half-day
  return 'afternoon';
};

export const AttendanceVibeCard = ({
  clockInTime,
  isSelf = true,
  userName = '',
}) => {
  // STRICT PRIVACY CHECK: Only show to the logged-in user themselves
  if (!isSelf) {
    return null;
  }

  const [copied, setCopied] = useState(false);
  const [punchIndexOffset, setPunchIndexOffset] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute parsed clock-in date
  const clockInDate = useMemo(() => {
    if (!clockInTime) return null;
    const d = new Date(clockInTime);
    return isNaN(d.getTime()) ? null : d;
  }, [clockInTime]);

  // If the user has not clocked in yet today, show a motivating & crazy Tanglish teaser
  if (!clockInDate) {
    return (
      <div className="rounded-2xl p-3.5 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/25 relative overflow-hidden text-xs space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-extrabold flex items-center gap-1.5 text-foreground uppercase tracking-wider text-[11px]">
            <Sparkles size={14} className="text-amber-500 animate-spin" />
            Today&apos;s Attendance Vibe • இன்றைய வைப்
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
            <Lock size={10} className="text-muted-foreground" /> Private to you
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Innum punch pannala bro!</strong> 9:30 dot-la clock in panni <span className="text-primary font-bold">&quot;Rolex Sir Timing&quot;</span> badge unlock pannu! Seekiram vandha <span className="text-emerald-600 font-bold">&quot;Office Owner&quot;</span> title ungaladhaakkikol! 🎯
        </p>
      </div>
    );
  }

  // Determine tier & items
  const tierKey = getTimingTier(clockInDate);
  const tierData = VIBE_TIERS[tierKey] || VIBE_TIERS.sharp;

  // Consistent daily index based on day of month + shuffle offset
  const todayDay = new Date().getDate();
  const currentIndex = (todayDay + punchIndexOffset) % tierData.items.length;
  const currentPunch = tierData.items[currentIndex];

  const formattedClockIn = clockInDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleShufflePunch = () => {
    setPunchIndexOffset((prev) => prev + 1);
    toast.success('Pudhu Punch Loaded! 😂', { duration: 1500 });
  };

  const handleCopyPunch = () => {
    const textToCopy = `"${currentPunch.punch}" - ${currentPunch.title} (RiseWithMedia Attendance Vibe at ${formattedClockIn}) 🎭`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Punch copied! WhatsApp / Slack-la share panni sirikkalam! 😂');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-br ${tierData.badgeTheme} border relative overflow-hidden transition-all duration-300 shadow-md`}>
      {/* Subtle Glow */}
      <div className={`absolute -right-6 -bottom-6 w-28 h-28 ${tierData.glowColor} rounded-full blur-2xl pointer-events-none`} />

      {/* Top Banner Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl select-none" role="img" aria-label="avatar">
            {tierData.avatarEmoji}
          </span>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierData.headerBadge}`}>
                {tierData.categoryLabel}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/80 bg-background/60 px-1.5 py-0.5 rounded-md border border-border/40">
                <Lock size={9} /> Only you see this
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleShufflePunch}
            title="Shuffle Dialogue / வேற காமெடி மாத்து"
            className="p-1.5 rounded-xl bg-background/80 hover:bg-background border border-border/50 text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            <Shuffle size={13} className="text-primary" />
          </button>
          <button
            type="button"
            onClick={handleCopyPunch}
            title="Copy Punchline to share"
            className="p-1.5 rounded-xl bg-background/80 hover:bg-background border border-border/50 text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-muted-foreground" />}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Vibe' : 'Collapse Vibe'}
            className="p-1.5 rounded-xl bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {!isCollapsed && (
        <div className="space-y-2.5">
          {/* Punchline Title Badge */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>{currentPunch.title}</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-background/60 px-2 py-0.5 rounded-lg border border-border/40 whitespace-nowrap">
              ⏱️ {formattedClockIn}
            </span>
          </div>

          {/* Crazy Punch Dialogue */}
          <div className="p-3 rounded-2xl bg-background/70 border border-border/60 shadow-xs relative">
            <p className="text-xs sm:text-[13px] font-bold text-foreground leading-relaxed italic">
              &ldquo;{currentPunch.punch}&rdquo;
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium leading-normal">
              {currentPunch.subtext}
            </p>
          </div>

          {/* Vibe Meter Footer */}
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-0.5">
            <span className="truncate pr-2">{tierData.meter}</span>
            <button
              type="button"
              onClick={handleShufflePunch}
              className="text-primary hover:underline shrink-0 font-extrabold cursor-pointer"
            >
              🎲 வேற டயலாக் மாத்து
            </button>
          </div>
        </div>
      )}

      {/* Collapsed view summary */}
      {isCollapsed && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-bold text-foreground truncate">
            {currentPunch.title} • &ldquo;{currentPunch.punch.slice(0, 45)}...&rdquo;
          </span>
          <span className="text-[10px] font-mono text-muted-foreground font-semibold shrink-0 ml-2">
            {formattedClockIn}
          </span>
        </div>
      )}
    </div>
  );
};

export default AttendanceVibeCard;
