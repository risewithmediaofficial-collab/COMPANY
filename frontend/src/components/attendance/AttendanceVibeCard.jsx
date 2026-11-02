import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  ChevronUp,
  X,
  Film,
  CalendarDays,
  PartyPopper,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 6 Stock Memes Per Week (Monday to Saturday) for each Timing Tier:
 * 1. early: Clock in < 09:25 AM
 * 2. sharp: Clock in 09:25 AM - 09:33 AM (Dot 9:30 AM)
 * 3. late:  Clock in 09:34 AM - 11:30 AM
 * 4. afternoon: Clock in > 11:30 AM
 */
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const VIBE_TIERS = {
  early: {
    categoryLabel: '👑 Early Bird / Shutter Thirappavargal',
    badgeTheme: 'from-emerald-500/20 via-teal-500/15 to-amber-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    headerBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    avatarEmoji: '👑',
    glowColor: 'bg-emerald-500/10',
    meter: '⚡ Over-Dedication Level: 9999% • Salary-la Extra ₹10 Sethu Podunga Sir!',
    stock: [
      {
        dayNum: 1,
        dayLabel: 'Monday',
        character: '🏆 VIP Raghuvaran (Dhanush)',
        movie: 'Velaiyilla Pattathari',
        stamp: '🔑 MASTER KEY HOLDER',
        title: 'OFFICE KEY UN KITA THAANA IRUKKU?!',
        punch: 'Tea kadai anna kooda innum aduppu patha vekkala bro... Shutter open panna night-ey ingaye tent potu paduthutiya?! 🔥',
        subtext: 'Monday morning ivlo speed-a vandha HR shock aagidum! Innum fan switch kooda podala, nee work start pannita!',
      },
      {
        dayNum: 2,
        dayLabel: 'Tuesday',
        character: '⚡ Thala Ajith (Billa) Style',
        movie: 'Billa',
        stamp: '👑 ROYAL VIP BIRD',
        title: 'VELAIKARAN ILLA... VIYARVAI THALAIVAN!',
        punch: 'Innum office bulb kooda muzhikkala... Un speed paathu server-ey shock aagi load aagudhu! Appraisal-la 100% hike confirm!',
        subtext: 'RiseWithMedia-vin muthal kural! Tuesday super speed VIP entry! 🚀',
      },
      {
        dayNum: 3,
        dayLabel: 'Wednesday',
        character: '🏢 Captain Vijayakanth Radar',
        movie: 'Captain Prabhakaran',
        stamp: '🏢 OWNER VIBE',
        title: 'COMPANY OWNER-A NEE?!',
        punch: 'Manager veetla innum brush pannitu irukkaru, nee inga report ready panriya?! Over-enthusiastic VIP bird sir neenga!',
        subtext: 'Security anna kitta irundhu saaviya vaangura mudhal aal! Dedicated level unbeatable!',
      },
      {
        dayNum: 4,
        dayLabel: 'Thursday',
        character: '🔥 Thalapathy Vijay (Ghilli)',
        movie: 'Ghilli',
        stamp: '⚡ KABADDI SPEED',
        title: 'KADAVULE AJITHEYY... EVLO SEEKIRAM?!',
        punch: 'Alarm adikkardhukku munnaadiye alarm-aye elupi vittutu vandhutaan polaye! Early login-la record break!',
        subtext: 'No traffic, no tension, pure royal mass entry! Thursday rockstar! 😎',
      },
      {
        dayNum: 5,
        dayLabel: 'Friday',
        character: '🕶️ Superstar Rajini (Sivaji Boss)',
        movie: 'Sivaji The Boss',
        stamp: '🦁 SINGAM SINGLE',
        title: 'FRIDAY MASS... FIRST IN THE BUILDING!',
        punch: 'Friday vandhuttale ellarum thunguvanga... Nee 9 manikkey vanthu laptop fan-ah suthavekkura! Verithanam bro!',
        subtext: 'Weekend mood-la kooda First In! Company owner certificate ungalukku thaan!',
      },
      {
        dayNum: 6,
        dayLabel: 'Saturday',
        character: '🎖️ Kamal Haasan (Vikram)',
        movie: 'Vikram',
        stamp: '🎖️ SATURDAY SOLDIER',
        title: 'AARAMBICHITANGALA... SATURDAY SOLDIER!',
        punch: 'Saturday-la ivlo seekiram vandhadhukku RiseWithMedia unakku oru gold medal tharanum bro! Dedication peak!',
        subtext: 'Aarambikkalaangala! Half day mudichu biryani sapda ready aagidu! 🍛',
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
    stock: [
      {
        dayNum: 1,
        dayLabel: 'Monday',
        character: '🎯 Rolex Sir (Vikram) Timing',
        movie: 'Vikram',
        stamp: '🎯 9:29:59 SNIPER',
        title: 'DOT-LA MASTER (9:29:59 SNIPER)',
        punch: 'Naan eppo varuven, epdi varuven-nu theriyadhu... Aana 9:30-ku dot-a biometric-la kai veppen!',
        subtext: 'Padikadhavan Dhanush speed-la millisecond timing punch! Mass kaatita thalaiva!',
      },
      {
        dayNum: 2,
        dayLabel: 'Tuesday',
        character: '⚡ Superstar Rajini (Annamalai)',
        movie: 'Annamalai',
        stamp: '⏱️ ATOMIC ACCURACY',
        title: 'ROLEX SIR TIMING... SHARP ENTRY!',
        punch: '1 Second miss aana HR half-day potruvaangannu therinju pota master stroke! Atomic clock-eh un kitta thaan time kekkum போல!',
        subtext: 'Thala pola varuma! Oru nodi munnum illa, pinnum illa... Absolute accuracy!',
      },
      {
        dayNum: 3,
        dayLabel: 'Wednesday',
        character: '🏎️ Bullet Pandi (Mankatha Speed)',
        movie: 'Mankatha',
        stamp: '⚡ FORMULA 1 SPEED',
        title: 'BIOMETRIC BULLET PANDI',
        punch: '9:29:58-ku lift vittu erangi, 9:29:59-ku finger vechu, 9:30:00-ku seat-la water bottle vecha legend!',
        subtext: 'Formula 1 pit stop timing! Speed-um mass-um un kitta thaan padikkanum! ⚡',
      },
      {
        dayNum: 4,
        dayLabel: 'Thursday',
        character: '🤖 Chitti (Enthiran) Robot Calibrated',
        movie: 'Enthiran',
        stamp: '🤖 SPEED 1 TERABYTE',
        title: 'SYSTEM-EY CONFUSE AANA ENTRY',
        punch: '9:30 dot timing paathu attendance machine-ey "Dei ivan manushan thaana illa robot-aa" nu yosikkudhu!',
        subtext: 'Idhudhaan da perfect balance! System crash aagura sharp timing!',
      },
      {
        dayNum: 5,
        dayLabel: 'Friday',
        character: '🎯 Thalapathy Vijay (Master JD)',
        movie: 'Master',
        stamp: '🎯 MASTER CLASS',
        title: 'MASTER STROKE... 9:30 SHARP!',
        punch: 'Vaathi kabbadi aadi kooda 9:30-ku attendance register-la signature potruvaaru! Sharpness overloaded!',
        subtext: 'Friday master class timing! HR-ke thannaale salute varum moment! 🎯',
      },
      {
        dayNum: 6,
        dayLabel: 'Saturday',
        character: '🕶️ Santhanam (SMS) Sharp Counter',
        movie: 'Siva Manasula Sakthi',
        stamp: '🏆 6/6 STREAK MASTER',
        title: 'DOT-LA KALAKKURA SIVAJI GANESAN!',
        punch: 'Saturday kooda 9:30 dot-la punch pannadha paathu HR kannula aanandha kanneer varudhu bro!',
        subtext: 'Sharp dot streak 6 out of 6! Unakku oru parotta parcel confirm!',
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
    stock: [
      {
        dayNum: 1,
        dayLabel: 'Monday',
        character: '🐢 Vadivelu (Winner Kaipulla)',
        movie: 'Winner',
        stamp: '🐢 KAIPULLA PASS',
        title: 'TRAFFIC THALAPATHY (SIGNAL-LA AADU)',
        punch: 'Alarm adichuchu... naan adha thirumba adichen! Boss, adhu traffic illa, signal-la aadu maatikituchu!',
        subtext: 'Ready-made excuses loaded: Train late, tyre puncture! Monitor-a paathu serious-a thalaya aatidu!',
      },
      {
        dayNum: 2,
        dayLabel: 'Tuesday',
        character: '🏃‍♂️ Vadivelu (Friends Nesamani)',
        movie: 'Friends',
        stamp: '🤫 NINJA ESCAPE',
        title: 'VADIVELU ESCAPE: IPPO THAAN VANDHEN!',
        punch: 'Ippo thaan vandhen boss, amaidhiya stealth ninja-va seat-la ukkandha yaarum kandupikka maattanga... Ninja technique!',
        subtext: 'Manager pakkathula varra varaikkum code editor screen-a full zoom panni veyyi! 🤫',
      },
      {
        dayNum: 3,
        dayLabel: 'Wednesday',
        character: '🛌 Vadivelu (Giri Bakery Veerabaghu)',
        movie: 'Giri',
        stamp: '🛌 SNOOZE KING',
        title: 'ALARM-EH EMATHTHIYA VEERAN',
        punch: '5 Minutes snooze pannen bro, kan muzhichu paatha 1 hour aayiduchu! Time machine kandupudichadhey namma thaan!',
        subtext: 'Late-a vandhalum latest-a vandhom! Tea break appo compensation panniruvom! ☕',
      },
      {
        dayNum: 4,
        dayLabel: 'Thursday',
        character: '🎭 Vadivelu (Encounter Ekambaram)',
        movie: 'Marudhamalai',
        stamp: '🚨 EKAMBARAM SIREN',
        title: 'MASS SLOW MOTION ENTRY',
        punch: 'Singam eppovume kootama varadhu, late-a thaan varum... Aana vandha vettai aaduradha yaarum thadukka mudiyadhu!',
        subtext: 'HR room pakkam thala vachu paduthuradha! Straight-a desk-ku escape aagu!',
      },
      {
        dayNum: 5,
        dayLabel: 'Friday',
        character: '🏃‍♂️ Santhanam (TVSK Love Guru)',
        movie: 'Theeya Velai Seiyyanum Kumaru',
        stamp: '🗺️ GPS CONFUSED',
        title: 'FRIDAY TRAFFIC JAM WARRIOR',
        punch: 'GPS route paathu vandhen bro... GPS-ey confuse aagi enakku leave poda sollichu! Epdiyo vandhuten la?!',
        subtext: 'Risk factor 95% • Boss tea sapda poradhukulla seat-la kerchief pottu ukkaru!',
      },
      {
        dayNum: 6,
        dayLabel: 'Saturday',
        character: '☕ Vadivelu (23am Pulikesi)',
        movie: 'Imsai Arasan 23am Pulikesi',
        stamp: '👑 PULIKESI TIME',
        title: 'AAGATTUM ARASARE... LATE ENTRY!',
        punch: 'Saturday-la 9:30-ku vandha enna, 10:30-ku vandha enna... Namma presence thaan mukkiyam arasare!',
        subtext: 'Thappu thaan aana mass! Fast forward mode-la velaya mudichu கிளம்புவோம்!',
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
    stock: [
      {
        dayNum: 1,
        dayLabel: 'Monday',
        character: '🎬 Climax Hero (Mankatha Vinayak)',
        movie: 'Mankatha',
        stamp: '🎬 INTERVAL HERO',
        title: 'SECOND HALF HERO / GUEST ENTRY',
        punch: 'Padathula interval-ku aprom thaan main character entry aagum! Lunch sapda vandhiya illa vela paaka vandhiya bro?!',
        subtext: 'Climax scene namma thaan carry panna porom! Post-lunch energy booster!',
      },
      {
        dayNum: 2,
        dayLabel: 'Tuesday',
        character: '🥪 Santhanam VIP Feast Chief',
        movie: 'Kalakalappu',
        stamp: '🥪 CHIEF GUEST',
        title: 'LUNCH SPECIAL CHIEF GUEST',
        punch: 'Morning show miss aachu, matinee show hit pannuvom! Straight-a cafeteria poyittu laptop open pannu!',
        subtext: 'Guest of honour for today\'s shift! Biryani manam mookai thulaikkiradhu! 🥪',
      },
      {
        dayNum: 3,
        dayLabel: 'Wednesday',
        character: '🕶️ Vikram (Anniyan Remo)',
        movie: 'Anniyan',
        stamp: '🕶️ REMO ENTRY',
        title: 'PAN-INDIAN VIP ENTRY',
        punch: 'Appadithaan varuven... Late-a vandhalum climax scene namma thaan dominate panrom! Mass VIP entry!',
        subtext: 'HR room pakkam pogaama stealth radar-la bypass panni vandha spy agent! 🕶️',
      },
      {
        dayNum: 4,
        dayLabel: 'Thursday',
        character: '⚡ Thalapathy Vijay (Leo Das)',
        movie: 'Leo',
        stamp: '🍫 BLOODY SWEET',
        title: 'BLOODY SWEET AFTERNOON ENTRY',
        punch: 'Enna late-nu kekkuriya?! Leo Das entry eppovume second half-la thaan bloody sweet-a irukkum!',
        subtext: 'Evening 7 manikku mela irundhu extra speed-la vela paathu compensate panniduvom!',
      },
      {
        dayNum: 5,
        dayLabel: 'Friday',
        character: '🎉 Vadivelu (Chandramukhi Murugesan)',
        movie: 'Chandramukhi',
        stamp: '👻 MAAPU ESCAPE',
        title: 'MAAPU... VACHITANGA DA AAPU!',
        punch: 'Maapu... Friday lunch time-la entry pottu thirumbi paatha manager kodi ethura maadhiri nikkiraaru!',
        subtext: 'Full confidence-la smile pannu, "Sir client call-la irundhen" nu ore podu!',
      },
      {
        dayNum: 6,
        dayLabel: 'Saturday',
        character: '🏖️ Dass & Team (Soodhu Kavvum)',
        movie: 'Soodhu Kavvum',
        stamp: '🏖️ WEEKEND CALL',
        title: 'SATURDAY MATINEE SHOW HERO',
        punch: 'Innum 2 maninerathula office close panna poranga, ippo thaan entry podriya?! Kadavule Ajithey!',
        subtext: 'Record breaker entry! Quick sync mudichu weekend celebrate pannu!',
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

  if (totalMinutes < 9 * 60 + 25) {
    return 'early';
  }
  if (totalMinutes <= 9 * 60 + 33) {
    return 'sharp';
  }
  if (totalMinutes <= 11 * 60 + 30) {
    return 'late';
  }
  return 'afternoon';
};

/**
 * Maps day of week to 0..5 (Monday: 0, Tuesday: 1, ..., Saturday: 5, Sunday: 0)
 */
const getDayStockIndex = () => {
  const day = new Date().getDay();
  if (day === 0) return 0; // Sunday -> Monday stock
  return Math.min(day - 1, 5);
};

export const AttendanceVibeCard = ({
  clockInTime,
  isSelf = true,
  userName = '',
  autoPopup = true,
}) => {
  // STRICT PRIVACY CHECK: Only show to the logged-in user themselves
  if (!isSelf) {
    return null;
  }

  const [copied, setCopied] = useState(false);
  const [selectedStockIndex, setSelectedStockIndex] = useState(getDayStockIndex);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Parse clock-in date
  const clockInDate = useMemo(() => {
    if (!clockInTime) return null;
    const d = new Date(clockInTime);
    return isNaN(d.getTime()) ? null : d;
  }, [clockInTime]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Automatic celebration popup on first clock-in of the day
  useEffect(() => {
    if (clockInDate && autoPopup) {
      const storageKey = `vibe_popup_seen_${todayStr}`;
      const hasSeen = sessionStorage.getItem(storageKey);
      if (!hasSeen) {
        setShowPopup(true);
        sessionStorage.setItem(storageKey, 'true');
      }
    }
  }, [clockInDate, autoPopup, todayStr]);

  // If the user has not clocked in yet today, show motivating teaser
  if (!clockInDate) {
    return (
      <div className="rounded-2xl p-4 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/25 relative overflow-hidden text-xs space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-extrabold flex items-center gap-1.5 text-foreground uppercase tracking-wider text-[11px]">
            <Sparkles size={14} className="text-amber-500 animate-spin" />
            Today&apos;s Attendance Vibe • 6-Day Stock Ready 🎭
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
            <Lock size={10} className="text-muted-foreground" /> Only you see this
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Innum punch pannala bro!</strong> 9:30 dot-la clock in panni <span className="text-primary font-bold">&quot;Rolex Sir Timing (9:29:59 Sniper)&quot;</span> badge unlock pannu! Seekiram vandha <span className="text-emerald-600 font-bold">&quot;Office Owner&quot;</span> title ungaladhaakkikol! 🎯
        </p>
      </div>
    );
  }

  // Determine tier & items
  const tierKey = getTimingTier(clockInDate);
  const tierData = VIBE_TIERS[tierKey] || VIBE_TIERS.sharp;

  // Active meme based on selected stock index (1 to 6)
  const currentPunch = tierData.stock[selectedStockIndex] || tierData.stock[0];

  const formattedClockIn = clockInDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleShufflePunch = () => {
    setSelectedStockIndex((prev) => (prev + 1) % tierData.stock.length);
    toast.success('Pudhu Meme Loaded! 😂', { duration: 1500 });
  };

  const handleCopyPunch = () => {
    const textToCopy = `"${currentPunch.punch}" - ${currentPunch.title} (${currentPunch.character} | RiseWithMedia Vibe at ${formattedClockIn}) 🎭`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Punch copied! WhatsApp / Slack-la share panni sirikkalam! 😂');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* ── PERSISTENT CARD IN ATTENDANCE WIDGET (Simultaneous Meme & Sticker) ── */}
      <div className={`rounded-3xl p-4.5 bg-gradient-to-br ${tierData.badgeTheme} border relative overflow-hidden transition-all duration-300 shadow-md`}>
        {/* Glow */}
        <div className={`absolute -right-8 -bottom-8 w-36 h-36 ${tierData.glowColor} rounded-full blur-2xl pointer-events-none`} />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl select-none" role="img" aria-label="avatar">
              {tierData.avatarEmoji}
            </span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierData.headerBadge}`}>
                  {tierData.categoryLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/80 bg-background/60 px-1.5 py-0.5 rounded-md border border-border/40">
                  <Lock size={9} /> Private to you
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pop Sticker Button */}
            <button
              type="button"
              onClick={() => setShowPopup(true)}
              title="Pop Sticker with Animation"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-white text-[11px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles size={12} className="animate-spin" />
              <span>Pop Sticker</span>
            </button>

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

        {/* 6-Day Stock Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <CalendarDays size={11} className="text-primary" /> 6-Day Stock:
          </span>
          {tierData.stock.map((item, idx) => {
            const isToday = getDayStockIndex() === idx;
            const isSelected = selectedStockIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedStockIndex(idx)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-foreground text-background shadow-xs scale-105'
                    : 'bg-background/60 hover:bg-background/90 text-muted-foreground border border-border/40'
                }`}
              >
                {DAY_NAMES[idx].slice(0, 3)} {isToday ? '• Today' : `#${idx + 1}`}
              </button>
            );
          })}
        </div>

        {/* Main Content Body: Meme & Sticker Displayed Simultaneously */}
        {!isCollapsed && (
          <div className="space-y-3 mt-1">
            {/* Title & Character Tag Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                  {currentPunch.stamp}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Film size={11} className="text-primary" /> {currentPunch.character}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-background/60 px-2 py-0.5 rounded-lg border border-border/40 whitespace-nowrap">
                ⏱️ Clocked at {formattedClockIn}
              </span>
            </div>

            {/* Simultaneous Meme Card */}
            <div className="p-3.5 rounded-2xl bg-background/80 border border-border/70 shadow-sm relative space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-black text-foreground tracking-tight">
                  {currentPunch.title}
                </h4>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded shrink-0">
                  🎬 {currentPunch.movie}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] font-bold text-foreground leading-relaxed italic border-l-2 border-primary/60 pl-2.5">
                &ldquo;{currentPunch.punch}&rdquo;
              </p>

              <p className="text-[11px] text-muted-foreground font-medium leading-normal pl-2.5">
                {currentPunch.subtext}
              </p>
            </div>

            {/* Vibe Meter Footer */}
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-0.5">
              <span className="truncate pr-2">{tierData.meter}</span>
              <button
                type="button"
                onClick={handleShufflePunch}
                className="text-primary hover:underline shrink-0 font-extrabold cursor-pointer flex items-center gap-1"
              >
                <span>🎲 அடுத்த காமெடி (#{((selectedStockIndex + 1) % 6) + 1}/6)</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsed view summary */}
        {isCollapsed && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-bold text-foreground truncate">
              {currentPunch.stamp} • {currentPunch.title}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground font-semibold shrink-0 ml-2">
              {formattedClockIn}
            </span>
          </div>
        )}
      </div>

      {/* ── CELEBRATORY ANIMATED STICKER POPUP MODAL ── */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPopup(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Animated Popup Container */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="relative w-full max-w-lg bg-card border-2 border-primary/40 rounded-3xl shadow-2xl overflow-hidden p-6 z-10 space-y-4"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer z-20"
              >
                <X size={16} />
              </button>

              {/* Sparkle Header */}
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                <PartyPopper size={16} className="text-amber-500 animate-bounce" />
                <span>Today&apos;s Attendance Badge Unlocked!</span>
              </div>

              {/* 3D Animated Sticker Badge */}
              <div className="flex flex-col items-center justify-center text-center py-2 relative">
                <motion.div
                  initial={{ scale: 0.5, rotate: -15 }}
                  animate={{ scale: 1, rotate: [0, -3, 3, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${tierData.badgeTheme} border-2 shadow-xl flex items-center justify-center text-5xl relative`}
                >
                  {tierData.avatarEmoji}
                  <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-foreground text-background text-[10px] font-black tracking-wider uppercase shadow-md">
                    {currentPunch.stamp}
                  </span>
                </motion.div>

                <h3 className="text-lg font-black text-foreground mt-4 tracking-tight">
                  {currentPunch.title}
                </h3>
                <p className="text-xs font-bold text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Film size={12} className="text-primary" /> {currentPunch.character} • {currentPunch.movie}
                </p>
              </div>

              {/* Simultaneous Meme Card in Popup */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-2xl bg-secondary/40 border border-border/80 space-y-2 shadow-inner"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1 text-primary">
                    <Zap size={13} /> Day {currentPunch.dayNum} of 6 • {currentPunch.dayLabel} Edition
                  </span>
                  <span className="font-mono bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                    ⏱️ {formattedClockIn}
                  </span>
                </div>

                <p className="text-sm font-extrabold text-foreground leading-relaxed italic border-l-3 border-primary pl-3">
                  &ldquo;{currentPunch.punch}&rdquo;
                </p>

                <p className="text-xs text-muted-foreground font-medium pl-3">
                  {currentPunch.subtext}
                </p>
              </motion.div>

              {/* Privacy Reassurance Note */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span className="flex items-center gap-1 font-semibold">
                  <Lock size={11} className="text-emerald-500" /> Private: Only you can see this meme badge
                </span>
                <span className="text-[10px] font-bold opacity-80">
                  Stock 6/6 Active
                </span>
              </div>

              {/* Footer Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleShufflePunch}
                  className="py-3 px-4 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-border"
                >
                  <Shuffle size={14} className="text-primary" />
                  <span>Next Meme ({((selectedStockIndex + 1) % 6) + 1}/6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="py-3 px-4 rounded-2xl bg-primary text-white font-black text-xs shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Mass Thalaiva!</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AttendanceVibeCard;
