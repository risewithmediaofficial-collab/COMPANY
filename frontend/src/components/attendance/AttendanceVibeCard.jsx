import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Lock,
  Check,
  Clock,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isSfxEnabled,
  setSfxEnabled,
  playTierSfx,
  playScanningSound,
} from '../../utils/attendanceSfx';

/* ── STICKER COMEDIAN SVG ILLUSTRATIONS ── */

const VadiveluSniperSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Sticker White Die-cut Glow */}
    <circle cx="60" cy="60" r="54" fill="#06B6D4" fillOpacity="0.18" />
    <circle cx="60" cy="60" r="50" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="6" />

    {/* Green Laser Crosshair Background */}
    <circle cx="60" cy="60" r="38" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
    <line x1="60" y1="16" x2="60" y2="104" stroke="#10B981" strokeWidth="1.5" opacity="0.4" />
    <line x1="16" y1="60" x2="104" y2="60" stroke="#10B981" strokeWidth="1.5" opacity="0.4" />

    {/* Head & Hair */}
    <path d="M38 42C38 28 82 28 82 42V56C82 72 72 84 60 84C48 84 38 72 38 56V42Z" fill="#FBBF24" stroke="#78350F" strokeWidth="3" />
    <path d="M35 38C38 24 55 20 60 20C65 20 82 24 85 38C80 32 72 30 60 30C48 30 40 32 35 38Z" fill="#1F2937" />

    {/* Big Cool Aviator Sunglasses (Rolex Style) */}
    <path d="M42 46H57V58C57 62 52 64 47 64C42 64 42 58 42 58V46Z" fill="#111827" stroke="#374151" strokeWidth="2" />
    <path d="M63 46H78V58C78 58 78 64 73 64C68 64 63 62 63 58V46Z" fill="#111827" stroke="#374151" strokeWidth="2" />
    <line x1="57" y1="49" x2="63" y2="49" stroke="#E5E7EB" strokeWidth="2" />
    {/* Sun reflection highlight */}
    <line x1="44" y1="48" x2="49" y2="58" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
    <line x1="65" y1="48" x2="70" y2="58" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />

    {/* Vadivelu Signature Thin Mustache */}
    <path d="M48 68C52 66 58 67 60 69C62 67 68 66 72 68C68 71 62 70 60 70C58 70 52 71 48 68Z" fill="#1F2937" />

    {/* Wide Grin / Laughing Mouth */}
    <path d="M50 72C50 78 70 78 70 72" fill="#BE123C" stroke="#78350F" strokeWidth="2" />
    <path d="M52 73H68C68 75 52 75 52 73Z" fill="#FFFFFF" />

    {/* Pointing Finger / Target Badge */}
    <g transform="translate(74, 62)">
      <circle cx="16" cy="16" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="3" />
      <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">🎯</text>
    </g>
  </svg>
);

const VadiveluKaipullaSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Sticker White Die-cut Glow */}
    <circle cx="60" cy="60" r="54" fill="#F97316" fillOpacity="0.18" />
    <circle cx="60" cy="60" r="50" fill="#FED7AA" stroke="#FFFFFF" strokeWidth="6" />

    {/* Flying Red Towel / Thundu behind */}
    <path d="M22 35C26 25 40 30 48 38C40 45 30 46 22 35Z" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
    <path d="M18 42C24 38 32 45 35 52C28 54 20 50 18 42Z" fill="#DC2626" opacity="0.8" />

    {/* Head & Expression */}
    <path d="M40 42C40 28 80 28 80 42V58C80 74 70 86 60 86C50 86 40 74 40 58V42Z" fill="#FDBA74" stroke="#7C2D12" strokeWidth="3" />
    <path d="M37 38C40 24 55 20 60 20C65 20 80 24 83 38C78 30 68 30 60 30C52 30 42 30 37 38Z" fill="#1F2937" />

    {/* Shocked/Crying Wide Eyes */}
    <circle cx="49" cy="48" r="7" fill="#FFFFFF" stroke="#7C2D12" strokeWidth="2" />
    <circle cx="71" cy="48" r="7" fill="#FFFFFF" stroke="#7C2D12" strokeWidth="2" />
    <circle cx="51" cy="48" r="3" fill="#1F2937" />
    <circle cx="69" cy="48" r="3" fill="#1F2937" />

    {/* Curved Sad Eyebrows */}
    <path d="M44 40C48 37 54 40 54 42" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M66 42C66 40 72 37 76 40" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />

    {/* Sweat Drop flying */}
    <path d="M85 45C85 45 89 50 89 53C89 55 87 57 85 57C83 57 81 55 81 53C81 50 85 45 85 45Z" fill="#38BDF8" />

    {/* Vadivelu Mustachio */}
    <path d="M48 64C52 62 58 63 60 65C62 63 68 62 72 64C68 67 62 66 60 66C58 66 52 67 48 64Z" fill="#1F2937" />

    {/* Shocked Crying Open Mouth */}
    <ellipse cx="60" cy="74" rx="9" ry="7" fill="#991B1B" stroke="#7C2D12" strokeWidth="2" />
    <path d="M54 71H66" stroke="#FFFFFF" strokeWidth="2" />

    {/* Running Turtle Badge */}
    <g transform="translate(74, 62)">
      <circle cx="16" cy="16" r="14" fill="#EA580C" stroke="#FFFFFF" strokeWidth="3" />
      <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">🐢</text>
    </g>
  </svg>
);

const GoundamaniRoyalSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Sticker White Die-cut Glow */}
    <circle cx="60" cy="60" r="54" fill="#10B981" fillOpacity="0.18" />
    <circle cx="60" cy="60" r="50" fill="#D1FAE5" stroke="#FFFFFF" strokeWidth="6" />

    {/* Golden Crown for Early Bird King */}
    <path d="M44 26L50 34L60 22L70 34L76 26V38H44V26Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
    <circle cx="60" cy="22" r="2.5" fill="#EF4444" />
    <circle cx="44" cy="26" r="2" fill="#3B82F6" />
    <circle cx="76" cy="26" r="2" fill="#3B82F6" />

    {/* Head & Hair */}
    <path d="M40 44C40 32 80 32 80 44V60C80 74 70 86 60 86C50 86 40 74 40 60V44Z" fill="#FCD34D" stroke="#78350F" strokeWidth="3" />
    <path d="M38 42C40 30 55 26 60 26C65 26 80 30 82 42C77 36 68 34 60 34C52 34 43 36 38 42Z" fill="#1F2937" />

    {/* Classic Goundamani Dark Glasses */}
    <rect x="42" y="47" width="16" height="13" rx="3" fill="#111827" stroke="#374151" strokeWidth="2" />
    <rect x="62" y="47" width="16" height="13" rx="3" fill="#111827" stroke="#374151" strokeWidth="2" />
    <line x1="58" y1="52" x2="62" y2="52" stroke="#E5E7EB" strokeWidth="2" />
    <line x1="45" y1="49" x2="52" y2="57" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="65" y1="49" x2="72" y2="57" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />

    {/* Thick Smug Mustache */}
    <path d="M46 66C50 63 58 64 60 67C62 64 70 63 74 66C70 71 63 69 60 69C57 69 50 71 46 66Z" fill="#1F2937" />

    {/* Smirking VIP Smile */}
    <path d="M52 73C56 77 66 76 69 72" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />

    {/* Cigar with smoke puff */}
    <rect x="66" y="68" width="14" height="4" rx="1.5" fill="#78350F" stroke="#451A03" strokeWidth="1" transform="rotate(15 66 68)" />
    <circle cx="80" cy="73" r="1.5" fill="#EF4444" />
    <path d="M82 72C84 70 85 68 87 69C89 70 89 68 91 67" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 1" />

    {/* Royal Key Badge */}
    <g transform="translate(74, 62)">
      <circle cx="16" cy="16" r="14" fill="#059669" stroke="#FFFFFF" strokeWidth="3" />
      <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">👑</text>
    </g>
  </svg>
);

const ChiefGuestAfternoonSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Sticker White Die-cut Glow */}
    <circle cx="60" cy="60" r="54" fill="#A855F7" fillOpacity="0.18" />
    <circle cx="60" cy="60" r="50" fill="#F3E8FF" stroke="#FFFFFF" strokeWidth="6" />

    {/* Golden VIP Garland / Mala */}
    <path d="M36 50C40 76 80 76 84 50" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
    <path d="M38 52C42 74 78 74 82 52" stroke="#EF4444" strokeWidth="3" strokeDasharray="4 4" />

    {/* Head */}
    <path d="M42 40C42 28 78 28 78 40V56C78 70 70 82 60 82C50 82 42 70 42 56V40Z" fill="#FDE68A" stroke="#78350F" strokeWidth="3" />
    <path d="M39 36C42 22 56 18 60 18C64 18 78 22 81 36C76 28 67 28 60 28C53 28 44 28 39 36Z" fill="#1F2937" />

    {/* Laughing Eyes */}
    <path d="M47 46C50 43 54 44 55 47" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M65 47C66 44 70 43 73 46" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />

    {/* Mustache */}
    <path d="M48 60C52 58 58 59 60 61C62 59 68 58 72 60C68 63 62 62 60 62C58 62 52 63 48 60Z" fill="#1F2937" />

    {/* Laughing Big Mouth */}
    <path d="M50 64C50 72 70 72 70 64" fill="#BE123C" stroke="#78350F" strokeWidth="2" />
    <path d="M52 65H68" stroke="#FFFFFF" strokeWidth="2" />

    {/* VIP Star Badge */}
    <g transform="translate(74, 62)">
      <circle cx="16" cy="16" r="14" fill="#9333EA" stroke="#FFFFFF" strokeWidth="3" />
      <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">🎬</text>
    </g>
  </svg>
);

const ScanningVadiveluSVG = () => (
  <svg viewBox="0 0 120 120" className="w-20 h-20 sm:w-24 sm:h-24 select-none animate-pulse" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="50" fill="#ECFDF5" stroke="#10B981" strokeWidth="4" strokeDasharray="6 4" />
    {/* Biometric fingerprint lines */}
    <path d="M48 55C48 45 72 45 72 55V68C72 75 66 80 60 80C54 80 48 75 48 68V60" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
    <path d="M54 58C54 52 66 52 66 58V66C66 70 63 73 60 73C57 73 54 70 54 66" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
    {/* Radar sweep beam */}
    <line x1="20" y1="60" x2="100" y2="60" stroke="#10B981" strokeWidth="2" strokeDasharray="2 2" />
  </svg>
);

/* ── COMEDIAN MEME STICKER DATA (ONE DEDICATED STICKER PER TIMING TIER) ── */

const STICKER_DATA = {
  early: {
    comedianName: 'கவுண்டமணி (Goundamani VIP)',
    stamp: '👑 ROYAL EARLY BIRD',
    bgTheme: 'from-emerald-500/15 via-teal-500/10 to-amber-500/10 border-emerald-500/40',
    tamilSpeech: 'அரசியல்ல இதெல்லாம் சாதாரணமப்பா! இவ்வளவு சீக்கிரம் வந்து ஆபீஸ் சாவியையா வாங்க போற?! 👑',
    tanglishPunch: 'Office key un kitta thaana irukku?! Shutter open panna night-ey ingaye tent potu thungitiya?!',
    subtext: 'Tea kadai anna kooda innum aduppu patha vekkala! Over-enthusiastic VIP bird of RiseWithMedia! 🚀',
    renderSticker: () => <GoundamaniRoyalSVG />,
  },
  sharp: {
    comedianName: 'வடிவேலு (Rolex Vadivelu)',
    stamp: '🎯 9:30 SHARP VADIVELU',
    bgTheme: 'from-cyan-500/15 via-blue-500/10 to-indigo-500/10 border-cyan-500/40',
    tamilSpeech: 'ஆஹா... கரெக்ட்டா 9:30 டா! ஒரு செகண்ட் முன்னாடியும் இல்ல, பின்னாடியும் இல்ல... கச்சிதமான ஆளு! 🎯',
    tanglishPunch: 'Naan eppo varuven, epdi varuven-nu theriyadhu... Aana 9:30-ku dot-a biometric-la kai veppen!',
    subtext: '9:29:59 Sniper timing! 1 second miss aana half-day aayidumnu therinju pota master stroke! ⚡',
    renderSticker: () => <VadiveluSniperSVG />,
  },
  late: {
    comedianName: 'வடிவேலு (Kaipulla Vadivelu)',
    stamp: '🐢 KAIPULLA ESCAPE PASS',
    bgTheme: 'from-amber-500/15 via-orange-500/10 to-rose-500/10 border-amber-500/40',
    tamilSpeech: 'வழில ஆடு குறுக்க வந்துருச்சு பாஸ்! என்ன பாத்து இப்படி கேட்டுட்டீங்களே?! 🐢',
    tanglishPunch: 'Alarm adichuchu... naan adha thirumba adichen! Boss, adhu traffic illa, signal-la aadu maatikituchu!',
    subtext: 'Ippo thaan vandhen boss, amaidhiya stealth mode-la seat-ku poyitta yaarum kandupikka maattanga! 🤫',
    renderSticker: () => <VadiveluKaipullaSVG />,
  },
  afternoon: {
    comedianName: 'கவுண்டமணி & செந்தில் (Chief Guest)',
    stamp: '🥪 CHIEF GUEST ARRIVAL',
    bgTheme: 'from-purple-500/15 via-fuchsia-500/10 to-pink-500/10 border-purple-500/40',
    tamilSpeech: 'அடடடா... சீஃப் கெஸ்ட் இப்பதான் வர்றாரா?! இடைவேளைக்கு அப்புறம் தான் ஹீரோ என்ட்ரியா?! 🎬',
    tanglishPunch: 'Padathula interval-ku aprom thaan main character entry aagum! Climax scene namma thaan carry panrom!',
    subtext: 'Morning show miss aachu, matinee show hit pannuvom! Straight-a cafeteria poyittu laptop open pannu! 🍛',
    renderSticker: () => <ChiefGuestAfternoonSVG />,
  },
};

const getTimingTier = (clockInDate) => {
  if (!clockInDate || isNaN(clockInDate.getTime())) return 'sharp';
  const hours = clockInDate.getHours();
  const minutes = clockInDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes < 9 * 60 + 25) return 'early';
  if (totalMinutes <= 9 * 60 + 33) return 'sharp';
  if (totalMinutes <= 11 * 60 + 30) return 'late';
  return 'afternoon';
};

export const AttendanceVibeCard = ({
  clockInTime,
  isSelf = true,
  isMarkingAttendance = false,
}) => {
  // STRICT PRIVACY CHECK: Only show to the logged-in user themselves
  if (!isSelf) {
    return null;
  }

  const [showPopup, setShowPopup] = useState(false);
  const [sfxOn, setSfxOn] = useState(isSfxEnabled);

  // Parse clock-in date
  const clockInDate = useMemo(() => {
    if (!clockInTime) return null;
    const d = new Date(clockInTime);
    return isNaN(d.getTime()) ? null : d;
  }, [clockInTime]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Determine timing tier & sticker
  const tierKey = getTimingTier(clockInDate);
  const sticker = STICKER_DATA[tierKey] || STICKER_DATA.sharp;

  const formattedClockIn = clockInDate
    ? clockInDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '--:--';

  // 1. Play scanning sound while marking attendance is in progress
  useEffect(() => {
    if (isMarkingAttendance) {
      playScanningSound();
    }
  }, [isMarkingAttendance]);

  // 2. Automatically popup with sound when attendance is marked!
  useEffect(() => {
    if (clockInDate) {
      const storageKey = `vibe_popup_seen_${todayStr}`;
      const hasSeen = sessionStorage.getItem(storageKey);
      if (!hasSeen) {
        setShowPopup(true);
        sessionStorage.setItem(storageKey, 'true');
        setTimeout(() => {
          playTierSfx(tierKey);
        }, 300);
      }
    }
  }, [clockInDate, todayStr, tierKey]);

  const handleToggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSfxEnabled(next);
    if (next) {
      toast.success('Sound Effects (SFX) ON! 🔊', { duration: 1500 });
      playTierSfx(tierKey);
    } else {
      toast.info('Sound Effects (SFX) Muted 🔇', { duration: 1500 });
    }
  };

  const handlePlaySound = () => {
    playTierSfx(tierKey);
  };

  // RULE 1: WHILE MARKING ATTENDANCE -> SHOW ANIMATED SCANNER STICKER
  if (isMarkingAttendance) {
    return (
      <div className="rounded-3xl p-4 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/10 border-2 border-emerald-500/40 shadow-lg relative overflow-hidden flex items-center gap-3 animate-pulse">
        <ScanningVadiveluSVG />
        <div className="space-y-1">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block flex items-center gap-1.5">
            <Radio size={14} className="animate-spin text-emerald-600" />
            பயோமெட்ரிக் கை வைக்கிறியா?! இரு இரு...
          </span>
          <p className="text-[11px] text-muted-foreground font-semibold">
            Connecting GPS &amp; marking your attendance... Hold tight thalaiva! ⏳
          </p>
        </div>
      </div>
    );
  }

  // RULE 2: WITHOUT MARKING DONT SHOW ANYTHING AT ALL!
  if (!clockInDate) {
    return null;
  }

  // RULE 3: ONCE MARKED -> SHOW AUTHENTIC TAMIL COMEDIAN MEME STICKER CARD
  return (
    <>
      {/* ── AUTHENTIC COMEDIAN MEME STICKER CARD (Strictly 1 Relevant Meme, No Clutter) ── */}
      <div className={`rounded-3xl p-4 bg-gradient-to-br ${sticker.bgTheme} border-2 relative overflow-hidden shadow-lg transition-all`}>
        {/* Die-cut Sticker Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-foreground text-background text-[10px] font-black uppercase tracking-wider shadow-xs">
              {sticker.stamp}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/80 bg-background/60 px-1.5 py-0.5 rounded-md border border-border/40">
              <Lock size={9} /> Only you see this
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSfx}
              title={sfxOn ? 'Mute Sound Effects' : 'Unmute Sound Effects'}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                sfxOn
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400'
                  : 'bg-background/80 hover:bg-background border-border/50 text-muted-foreground'
              }`}
            >
              {sfxOn ? <Volume2 size={13} className="animate-pulse" /> : <VolumeX size={13} />}
            </button>

            {/* Replay Sound Button */}
            <button
              type="button"
              onClick={handlePlaySound}
              title="Replay Comedian Sound Effect"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-black transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Volume2 size={12} className="animate-bounce" />
              <span>Play SFX</span>
            </button>
          </div>
        </div>

        {/* Sticker Visual & Comic Speech Bubble Layout */}
        <div className="flex items-center gap-3">
          {/* Animated Comedian Graphic with Sticker Border */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="shrink-0 cursor-pointer p-1 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border-2 border-white shadow-md"
            onClick={handlePlaySound}
            title="Click to hear comedian punch!"
          >
            {sticker.renderSticker()}
          </motion.div>

          {/* Comic Speech Bubble with Tamil Dialogue & Tanglish Punch */}
          <div className="flex-1 min-w-0 space-y-1.5 relative p-3 rounded-2xl bg-background/90 border border-border/70 shadow-xs">
            {/* Speech bubble pointer arrow pointing left toward comedian */}
            <div className="absolute -left-2 top-6 w-3 h-3 bg-background/90 border-l border-b border-border/70 rotate-45" />

            {/* Tamil Comedian Punchline */}
            <p className="text-xs sm:text-[13px] font-black text-foreground leading-snug">
              &ldquo;{sticker.tamilSpeech}&rdquo;
            </p>

            {/* Tanglish Sub-Punch */}
            <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
              {sticker.tanglishPunch}
            </p>

            {/* Time Stamp */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
              <span className="font-sans font-bold text-primary">{sticker.comedianName}</span>
              <span>⏱️ Clocked at {formattedClockIn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CELEBRATORY ANIMATED STICKER POPUP MODAL (ON ATTENDANCE MARKED) ── */}
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

            {/* Spring Bouncing Sticker Modal */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative w-full max-w-md bg-card border-2 border-primary/40 rounded-3xl shadow-2xl overflow-hidden p-6 z-10 space-y-4"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer z-20"
              >
                <X size={16} />
              </button>

              {/* Title Tag */}
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                <Sparkles size={16} className="text-amber-500 animate-spin" />
                <span>Attendance Marked! • {sticker.stamp}</span>
              </div>

              {/* Large Centered Animated Sticker */}
              <div className="flex flex-col items-center justify-center text-center py-2">
                <motion.div
                  initial={{ scale: 0.7, rotate: -12 }}
                  animate={{ scale: 1, rotate: [0, -3, 3, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
                  className="p-3 rounded-3xl bg-white dark:bg-zinc-900 border-4 border-white shadow-2xl cursor-pointer"
                  onClick={handlePlaySound}
                  title="Click to replay sound!"
                >
                  {sticker.renderSticker()}
                </motion.div>

                <h3 className="text-base sm:text-lg font-black text-foreground mt-4 px-2 leading-snug">
                  &ldquo;{sticker.tamilSpeech}&rdquo;
                </h3>
                <p className="text-xs font-bold text-muted-foreground mt-1">
                  {sticker.tanglishPunch}
                </p>
              </div>

              {/* Reassurance & Timestamp */}
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border/70 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock size={12} className="text-emerald-500" /> Private to you
                </span>
                <span className="font-mono font-bold text-foreground">
                  ⏱️ Clocked In at {formattedClockIn}
                </span>
              </div>

              {/* Close / Celebrate Action */}
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>Mass Thalaiva! (Super)</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AttendanceVibeCard;
