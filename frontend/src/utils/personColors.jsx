import React from 'react';
import { User } from 'lucide-react';
import { getAssetUrl } from './assetUrl';

export const PERSON_COLOR_PALETTES = [
  {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-500/35 dark:border-emerald-500/50',
    avatarBg: 'bg-emerald-600 dark:bg-emerald-500',
    accentBorder: 'border-l-emerald-500',
    accentGlow: 'hover:border-emerald-500/60',
    dot: 'bg-emerald-500',
    name: 'emerald',
  },
  {
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-500/35 dark:border-indigo-500/50',
    avatarBg: 'bg-indigo-600 dark:bg-indigo-500',
    accentBorder: 'border-l-indigo-500',
    accentGlow: 'hover:border-indigo-500/60',
    dot: 'bg-indigo-500',
    name: 'indigo',
  },
  {
    bg: 'bg-amber-500/15 dark:bg-amber-500/25',
    text: 'text-amber-900 dark:text-amber-300',
    border: 'border-amber-500/35 dark:border-amber-500/50',
    avatarBg: 'bg-amber-600 dark:bg-amber-500',
    accentBorder: 'border-l-amber-500',
    accentGlow: 'hover:border-amber-500/60',
    dot: 'bg-amber-500',
    name: 'amber',
  },
  {
    bg: 'bg-violet-500/15 dark:bg-violet-500/25',
    text: 'text-violet-800 dark:text-violet-300',
    border: 'border-violet-500/35 dark:border-violet-500/50',
    avatarBg: 'bg-violet-600 dark:bg-violet-500',
    accentBorder: 'border-l-violet-500',
    accentGlow: 'hover:border-violet-500/60',
    dot: 'bg-violet-500',
    name: 'violet',
  },
  {
    bg: 'bg-rose-500/15 dark:bg-rose-500/25',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-500/35 dark:border-rose-500/50',
    avatarBg: 'bg-rose-600 dark:bg-rose-500',
    accentBorder: 'border-l-rose-500',
    accentGlow: 'hover:border-rose-500/60',
    dot: 'bg-rose-500',
    name: 'rose',
  },
  {
    bg: 'bg-cyan-500/15 dark:bg-cyan-500/25',
    text: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-500/35 dark:border-cyan-500/50',
    avatarBg: 'bg-cyan-600 dark:bg-cyan-500',
    accentBorder: 'border-l-cyan-500',
    accentGlow: 'hover:border-cyan-500/60',
    dot: 'bg-cyan-500',
    name: 'cyan',
  },
  {
    bg: 'bg-fuchsia-500/15 dark:bg-fuchsia-500/25',
    text: 'text-fuchsia-800 dark:text-fuchsia-300',
    border: 'border-fuchsia-500/35 dark:border-fuchsia-500/50',
    avatarBg: 'bg-fuchsia-600 dark:bg-fuchsia-500',
    accentBorder: 'border-l-fuchsia-500',
    accentGlow: 'hover:border-fuchsia-500/60',
    dot: 'bg-fuchsia-500',
    name: 'fuchsia',
  },
  {
    bg: 'bg-teal-500/15 dark:bg-teal-500/25',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-500/35 dark:border-teal-500/50',
    avatarBg: 'bg-teal-600 dark:bg-teal-500',
    accentBorder: 'border-l-teal-500',
    accentGlow: 'hover:border-teal-500/60',
    dot: 'bg-teal-500',
    name: 'teal',
  },
  {
    bg: 'bg-orange-500/15 dark:bg-orange-500/25',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-500/35 dark:border-orange-500/50',
    avatarBg: 'bg-orange-600 dark:bg-orange-500',
    accentBorder: 'border-l-orange-500',
    accentGlow: 'hover:border-orange-500/60',
    dot: 'bg-orange-500',
    name: 'orange',
  },
  {
    bg: 'bg-blue-500/15 dark:bg-blue-500/25',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-500/35 dark:border-blue-500/50',
    avatarBg: 'bg-blue-600 dark:bg-blue-500',
    accentBorder: 'border-l-blue-500',
    accentGlow: 'hover:border-blue-500/60',
    dot: 'bg-blue-500',
    name: 'blue',
  },
  {
    bg: 'bg-lime-500/15 dark:bg-lime-500/25',
    text: 'text-lime-900 dark:text-lime-300',
    border: 'border-lime-500/35 dark:border-lime-500/50',
    avatarBg: 'bg-lime-600 dark:bg-lime-500',
    accentBorder: 'border-l-lime-500',
    accentGlow: 'hover:border-lime-500/60',
    dot: 'bg-lime-500',
    name: 'lime',
  },
  {
    bg: 'bg-pink-500/15 dark:bg-pink-500/25',
    text: 'text-pink-800 dark:text-pink-300',
    border: 'border-pink-500/35 dark:border-pink-500/50',
    avatarBg: 'bg-pink-600 dark:bg-pink-500',
    accentBorder: 'border-l-pink-500',
    accentGlow: 'hover:border-pink-500/60',
    dot: 'bg-pink-500',
    name: 'pink',
  },
];

/**
 * Returns a deterministic color palette based on person's name or ID
 */
export const getPersonColor = (nameOrId = '') => {
  const str = String(nameOrId || 'unassigned').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PERSON_COLOR_PALETTES.length;
  return PERSON_COLOR_PALETTES[index];
};

/**
 * Extracts a normalized list of assignee objects with name and avatar
 */
export const extractTaskAssignees = (task = {}) => {
  if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
    return task.assignedTo
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'object') {
          return {
            _id: item._id,
            name: item.name || 'Team Member',
            avatar: item.avatar || null,
            role: item.role || '',
          };
        }
        return { _id: item, name: 'Team Member', avatar: null };
      })
      .filter(Boolean);
  }

  if (task.assignedPersonName) {
    return task.assignedPersonName
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name, avatar: null }));
  }

  if (task.assignedTo && typeof task.assignedTo === 'object') {
    return [{
      _id: task.assignedTo._id,
      name: task.assignedTo.name || 'Team Member',
      avatar: task.assignedTo.avatar || null,
      role: task.assignedTo.role || '',
    }];
  }

  return [];
};

/**
 * Renders a color-coded person badge with avatar/initials and name
 */
export const PersonAssigneeBadge = ({ person, size = 'sm', showRole = false }) => {
  if (!person) return null;
  const name = typeof person === 'object' ? (person.name || 'Team Member') : String(person);
  const avatar = typeof person === 'object' ? person.avatar : null;
  const role = typeof person === 'object' ? person.role : null;
  const color = getPersonColor(name);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition-all ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${color.bg} ${color.text} ${color.border} shadow-2xs`}
      title={`Assigned to: ${name}${role ? ` (${role})` : ''}`}
    >
      {avatar ? (
        <img
          src={getAssetUrl(avatar)}
          alt=""
          className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full object-cover shrink-0 ring-1 ring-white/20`}
        />
      ) : (
        <span
          className={`${
            isSmall ? 'w-3.5 h-3.5 text-[8px]' : 'w-4 h-4 text-[9px]'
          } rounded-full ${color.avatarBg} text-white flex items-center justify-center font-black shrink-0 shadow-xs`}
        >
          {initials}
        </span>
      )}
      <span className="truncate max-w-[140px] font-bold">{name}</span>
      {showRole && role && (
        <span className="opacity-75 text-[9px] font-normal hidden sm:inline">({role})</span>
      )}
    </span>
  );
};
