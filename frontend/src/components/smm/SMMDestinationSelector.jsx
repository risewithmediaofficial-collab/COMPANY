import React from 'react';
import {
  getDestinationsForObjective,
  normalizeObjective,
  objectiveSupportsSocial
} from '../../utils/smmDestinations';
import { MessageCircle, PhoneCall, Instagram, Facebook, Smartphone, FileSpreadsheet, Check } from 'lucide-react';

export const SMMDestinationSelector = ({
  objective = 'Awareness',
  value = '',
  onChange,
  label = 'Destination / Form Type *',
}) => {
  const normObj = normalizeObjective(objective);
  const destinations = getDestinationsForObjective(normObj);
  const supportsSocial = objectiveSupportsSocial(normObj);

  const isInstagramSelected = value === 'Instagram' || value === 'Instagram & Facebook';
  const isFacebookSelected = value === 'Facebook' || value === 'Instagram & Facebook';
  const isSocialActive = value === 'Instagram' || value === 'Facebook' || value === 'Instagram & Facebook';

  const handleSelectPrimary = (destValue) => {
    if (destValue === 'Instagram') {
      onChange('Instagram', ['Instagram']);
    } else if (destValue === 'Facebook') {
      onChange('Facebook', ['Facebook']);
    } else if (destValue === 'Instagram & Facebook') {
      onChange('Instagram & Facebook', ['Instagram', 'Facebook']);
    } else {
      onChange(destValue, []);
    }
  };

  const handleTogglePlatform = (platform) => {
    if (platform === 'Instagram') {
      if (isInstagramSelected && !isFacebookSelected) {
        // Can't uncheck if it's the only one, or switch to FB
        onChange('Facebook', ['Facebook']);
      } else if (isInstagramSelected && isFacebookSelected) {
        onChange('Facebook', ['Facebook']);
      } else {
        // Was only FB, now both
        onChange('Instagram & Facebook', ['Instagram', 'Facebook']);
      }
    } else if (platform === 'Facebook') {
      if (isFacebookSelected && !isInstagramSelected) {
        onChange('Instagram', ['Instagram']);
      } else if (isFacebookSelected && isInstagramSelected) {
        onChange('Instagram', ['Instagram']);
      } else {
        onChange('Instagram & Facebook', ['Instagram', 'Facebook']);
      }
    }
  };

  const getIcon = (item) => {
    const v = item.value.toLowerCase();
    if (v.includes('message')) return <MessageCircle size={14} className="text-emerald-500" />;
    if (v.includes('call')) return <PhoneCall size={14} className="text-blue-500" />;
    if (v === 'instagram') return <Instagram size={14} className="text-pink-500" />;
    if (v === 'facebook') return <Facebook size={14} className="text-blue-600" />;
    if (v.includes('instagram & facebook')) return <span className="text-xs">✨</span>;
    if (v.includes('app')) return <Smartphone size={14} className="text-purple-500" />;
    if (v.includes('instant form')) return <FileSpreadsheet size={14} className="text-amber-500" />;
    return <span className="text-xs">{item.icon || '🎯'}</span>;
  };

  return (
    <div className="p-3.5 bg-secondary/30 rounded-2xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
          <MessageCircle size={14} className="text-primary" /> {label}
        </label>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          Objective: {normObj}
        </span>
      </div>

      {/* Main Dropdown */}
      <select
        value={value}
        onChange={(e) => handleSelectPrimary(e.target.value)}
        className="app-select font-semibold"
        required
      >
        <option value="">-- Select Destination --</option>
        {destinations.map((d) => (
          <option key={d.value} value={d.value}>
            {d.icon} {d.label}
          </option>
        ))}
      </select>

      {/* Social Multi-Select Pills (Only active when objective supports Instagram / Facebook) */}
      {supportsSocial && (
        <div className="p-2.5 rounded-xl bg-background/80 border border-border space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <span>📱 Social Destination:</span>
              <span className="text-muted-foreground font-normal">(Select Instagram, Facebook, or both)</span>
            </span>
            {isSocialActive && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Instagram toggle button */}
            <button
              type="button"
              onClick={() => {
                if (!isSocialActive) {
                  onChange('Instagram', ['Instagram']);
                } else {
                  handleTogglePlatform('Instagram');
                }
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isInstagramSelected
                  ? 'bg-pink-500/15 border-pink-500 text-pink-700 dark:text-pink-300 shadow-xs'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Instagram size={15} className={isInstagramSelected ? 'text-pink-500' : 'text-muted-foreground'} />
                <span>Instagram</span>
              </div>
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                isInstagramSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-border'
              }`}>
                {isInstagramSelected && <Check size={11} strokeWidth={3} />}
              </div>
            </button>

            {/* Facebook toggle button */}
            <button
              type="button"
              onClick={() => {
                if (!isSocialActive) {
                  onChange('Facebook', ['Facebook']);
                } else {
                  handleTogglePlatform('Facebook');
                }
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isFacebookSelected
                  ? 'bg-blue-600/15 border-blue-600 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Facebook size={15} className={isFacebookSelected ? 'text-blue-600' : 'text-muted-foreground'} />
                <span>Facebook</span>
              </div>
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                isFacebookSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-border'
              }`}>
                {isFacebookSelected && <Check size={11} strokeWidth={3} />}
              </div>
            </button>
          </div>

          {/* Quick preset buttons for Instagram & Facebook */}
          <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px]">
            <span className="text-muted-foreground">Quick Select:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange('Instagram', ['Instagram'])}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  value === 'Instagram'
                    ? 'bg-pink-500/20 text-pink-600 border-pink-500/40 font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                }`}
              >
                Only IG
              </button>
              <button
                type="button"
                onClick={() => onChange('Facebook', ['Facebook'])}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  value === 'Facebook'
                    ? 'bg-blue-600/20 text-blue-600 border-blue-600/40 font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                }`}
              >
                Only FB
              </button>
              <button
                type="button"
                onClick={() => onChange('Instagram & Facebook', ['Instagram', 'Facebook'])}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  value === 'Instagram & Facebook'
                    ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                }`}
              >
                Both (IG & FB)
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Active Destination: <strong className="text-foreground">{value || 'None selected'}</strong>
      </p>
    </div>
  );
};

export default SMMDestinationSelector;
