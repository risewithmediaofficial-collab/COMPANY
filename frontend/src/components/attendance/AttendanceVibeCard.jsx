import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Check,
  Clock,
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import {
  isSfxEnabled,
  setSfxEnabled,
  playComedianAudio,
  stopComedianAudio,
  playClockOutAudio,
} from '../../utils/attendanceSfx';

/* ── STICKER DATA PER TIMING TIER & TYPE ── */

const STICKER_DATA = {
  early: {
    title: 'Royal Early Bird',
    badge: 'bg-primary text-primary-foreground border-primary',
    imageSrc: '/images/stickers/sticker_1_early_bird_1793767351724.webp',
    glowColor: '',
  },
  sharp: {
    title: '9:30 Sharp Dot',
    badge: 'bg-secondary text-foreground border-border',
    imageSrc: '/images/stickers/sticker_2_sharp_930_dot_1793767391963.webp',
    glowColor: '',
  },
  late: {
    title: 'Kaipulla Escape Pass',
    badge: 'bg-muted text-foreground border-border',
    imageSrc: '/images/stickers/sticker_3_kaipulla_late_arrival_1793767415224.webp',
    glowColor: '',
  },
  afternoon: {
    title: 'Chief Guest Arrival',
    badge: 'bg-secondary text-muted-foreground border-border',
    imageSrc: '/images/stickers/sticker_4_chief_guest_arrival_1793767436185.webp',
    glowColor: '',
  },
  clockout: {
    title: 'Varata Mame! Punch Out',
    badge: 'bg-secondary text-foreground border-border',
    imageSrc: '/images/stickers/sticker_5_punch_out_scooter_1793767458852.webp',
    glowColor: '',
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

/**
 * AttendanceVibeCard:
 * - Pure visual WhatsApp-style sticker popup with authentic Kollywood comedian sound playback.
 * - Text-free comic sticker presentation (comic typography is embedded inside the sticker art itself).
 * - Leaves 0 footprint in the overview (returns null when closed).
 * - Plays authentic comedian audio on open; supports tapping sticker to replay.
 */
export const AttendanceVibeCard = ({
  clockInTime,
  isOpen = false,
  onClose = () => {},
  type = 'clockin',
}) => {
  const [sfxOn, setSfxOn] = useState(isSfxEnabled);

  // Parse clock-in date
  const eventDate = useMemo(() => {
    if (!clockInTime) return new Date();
    const d = new Date(clockInTime);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [clockInTime]);

  // Determine timing tier & sticker
  const tierKey = type === 'clockout' ? 'clockout' : getTimingTier(eventDate);
  const sticker = STICKER_DATA[tierKey] || STICKER_DATA.sharp;

  const formattedTime = eventDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const playActiveSound = () => {
    if (type === 'clockout') {
      playClockOutAudio();
    } else {
      playComedianAudio(tierKey);
    }
  };

  // Play authentic comedian movie audio automatically on popup open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        playActiveSound();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopComedianAudio();
      };
    } else {
      stopComedianAudio();
    }
  }, [isOpen, tierKey, type]);

  const handleToggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSfxEnabled(next);
    if (next) {
      toast.success('Audio ON', { duration: 1500 });
      playActiveSound();
    } else {
      toast.info('Audio Muted', { duration: 1500 });
      stopComedianAudio();
    }
  };

  const handleReplay = () => {
    playActiveSound();
  };

  const handleClose = () => {
    stopComedianAudio();
    if (onClose) onClose();
  };

  // Zero footprint in overview when closed
  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/75"
        />

        {/* WhatsApp-Style Comedian Sticker Popup Card */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 40, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="relative w-full max-w-sm bg-card border-2 border-border rounded-3xl shadow-2xl p-5 z-10 flex flex-col items-center select-none"
        >
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-border/50">
            {/* Tier Badge */}
            <div className={`px-3 py-1 rounded-full border text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm ${sticker.badge}`}>
              <Sparkles size={13} className="shrink-0" />
              <span>{sticker.title}</span>
            </div>

            {/* Controls: Audio Toggle + Close */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSfx}
                title={sfxOn ? 'Mute Audio' : 'Unmute Audio'}
                className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs flex items-center justify-center cursor-pointer transition-all"
              >
                {sfxOn ? (
                  <Volume2 size={15} className="text-foreground" />
                ) : (
                  <VolumeX size={15} className="text-muted-foreground" />
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                title="Close"
                className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Centered Large Sticker Image */}
          <div className="relative py-4 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, rotate: -6 }}
              animate={{
                scale: [1, 1.03, 0.98, 1],
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleReplay}
              title="Click to replay comedian sound!"
              className="cursor-pointer group relative"
            >
              {/* WhatsApp Sticker Styling */}
              <img
                src={sticker.imageSrc}
                alt={sticker.title}
                className="w-52 h-52 sm:w-64 sm:h-64 object-contain rounded-2xl drop-shadow-2xl transition-all duration-300 filter group-hover:brightness-105"
                draggable={false}
              />

              {/* Sound Pulse Pill over Sticker on Hover */}
              <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Volume2 size={12} className="shrink-0" />
                <span>Tap to Replay</span>
              </div>
            </motion.div>
          </div>

          {/* Timestamp Pill & Replay Audio Button */}
          <div className="w-full flex items-center justify-between gap-2 px-1 pt-1 pb-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/60 text-muted-foreground font-mono font-bold tabular-nums">
              <Clock size={13} className="text-foreground shrink-0" />
              <span>{type === 'clockout' ? 'Clocked Out' : 'Clocked In'}: {formattedTime}</span>
            </div>

            <button
              type="button"
              onClick={handleReplay}
              className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-muted text-foreground border border-border font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title="Replay dialogue audio"
            >
              <Volume2 size={13} className="shrink-0" />
              <span>Replay</span>
            </button>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>Mass Thalaiva!</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AttendanceVibeCard;
