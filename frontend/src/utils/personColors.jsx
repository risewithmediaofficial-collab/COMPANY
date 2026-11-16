import React from 'react';
import { getAssetUrl } from './assetUrl';

export const PERSON_COLOR_PALETTES = [
  {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-800 dark:text-cyan-200',
    border: 'border-cyan-200/80 dark:border-cyan-800/50',
    avatarBg: 'bg-cyan-600 dark:bg-cyan-500',
    accentBorder: 'border-l-cyan-500',
    accentGlow: 'hover:border-cyan-500/50',
    dot: 'bg-cyan-500',
    name: 'cyan',
  },
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-200/80 dark:border-indigo-800/50',
    avatarBg: 'bg-indigo-600 dark:bg-indigo-500',
    accentBorder: 'border-l-indigo-500',
    accentGlow: 'hover:border-indigo-500/50',
    dot: 'bg-indigo-500',
    name: 'indigo',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-200/80 dark:border-emerald-800/50',
    avatarBg: 'bg-emerald-600 dark:bg-emerald-500',
    accentBorder: 'border-l-emerald-500',
    accentGlow: 'hover:border-emerald-500/50',
    dot: 'bg-emerald-500',
    name: 'emerald',
  },
  {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-200/80 dark:border-purple-800/50',
    avatarBg: 'bg-purple-600 dark:bg-purple-500',
    accentBorder: 'border-l-purple-500',
    accentGlow: 'hover:border-purple-500/50',
    dot: 'bg-purple-500',
    name: 'purple',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-200/80 dark:border-amber-800/50',
    avatarBg: 'bg-amber-600 dark:bg-amber-500',
    accentBorder: 'border-l-amber-500',
    accentGlow: 'hover:border-amber-500/50',
    dot: 'bg-amber-500',
    name: 'amber',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-200/80 dark:border-rose-800/50',
    avatarBg: 'bg-rose-600 dark:bg-rose-500',
    accentBorder: 'border-l-rose-500',
    accentGlow: 'hover:border-rose-500/50',
    dot: 'bg-rose-500',
    name: 'rose',
  },
  {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-800 dark:text-sky-200',
    border: 'border-sky-200/80 dark:border-sky-800/50',
    avatarBg: 'bg-sky-600 dark:bg-sky-500',
    accentBorder: 'border-l-sky-500',
    accentGlow: 'hover:border-sky-500/50',
    dot: 'bg-sky-500',
    name: 'sky',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-800 dark:text-teal-200',
    border: 'border-teal-200/80 dark:border-teal-800/50',
    avatarBg: 'bg-teal-600 dark:bg-teal-500',
    accentBorder: 'border-l-teal-500',
    accentGlow: 'hover:border-teal-500/50',
    dot: 'bg-teal-500',
    name: 'teal',
  },
];

/**
 * Returns a deterministic monochrome palette based on person's name or ID
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
 * Renders a monochrome assignee badge with avatar/initials and name
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
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors border ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${color.bg} ${color.text} ${color.border}`}
      title={`Assigned to: ${name}${role ? ` (${role})` : ''}`}
    >
      {avatar ? (
        <img
          src={getAssetUrl(avatar)}
          alt=""
          className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full object-cover shrink-0`}
        />
      ) : (
        <span
          className={`${
            isSmall ? 'w-3.5 h-3.5 text-[8px]' : 'w-4 h-4 text-[9px]'
          } rounded-full ${color.avatarBg} text-white dark:text-zinc-950 flex items-center justify-center font-black shrink-0`}
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
