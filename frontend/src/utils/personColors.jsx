import React from 'react';
import { getAssetUrl } from './assetUrl';

export const PERSON_COLOR_PALETTES = [
  {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80',
    text: 'text-zinc-900 dark:text-zinc-100',
    border: 'border-zinc-300 dark:border-zinc-700',
    avatarBg: 'bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-950',
    accentBorder: 'border-l-zinc-900 dark:border-l-zinc-100',
    accentGlow: 'hover:border-zinc-500/60',
    dot: 'bg-zinc-900 dark:bg-zinc-100',
    name: 'zinc-900',
  },
  {
    bg: 'bg-neutral-100 dark:bg-neutral-800/80',
    text: 'text-neutral-800 dark:text-neutral-200',
    border: 'border-neutral-300 dark:border-neutral-700',
    avatarBg: 'bg-neutral-700 dark:bg-neutral-300 dark:text-neutral-950',
    accentBorder: 'border-l-neutral-700 dark:border-l-neutral-300',
    accentGlow: 'hover:border-neutral-500/60',
    dot: 'bg-neutral-700 dark:bg-neutral-300',
    name: 'neutral-700',
  },
  {
    bg: 'bg-zinc-200/70 dark:bg-zinc-800',
    text: 'text-zinc-800 dark:text-zinc-200',
    border: 'border-zinc-300 dark:border-zinc-700',
    avatarBg: 'bg-zinc-700 dark:bg-zinc-300 dark:text-zinc-950',
    accentBorder: 'border-l-zinc-600 dark:border-l-zinc-400',
    accentGlow: 'hover:border-zinc-500/60',
    dot: 'bg-zinc-600 dark:bg-zinc-400',
    name: 'zinc-600',
  },
  {
    bg: 'bg-stone-100 dark:bg-stone-800/80',
    text: 'text-stone-800 dark:text-stone-200',
    border: 'border-stone-300 dark:border-stone-700',
    avatarBg: 'bg-stone-700 dark:bg-stone-300 dark:text-stone-950',
    accentBorder: 'border-l-stone-600 dark:border-l-stone-400',
    accentGlow: 'hover:border-stone-500/60',
    dot: 'bg-stone-600 dark:bg-stone-400',
    name: 'stone',
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
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${color.bg} ${color.text}`}
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
