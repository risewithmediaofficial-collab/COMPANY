import React from 'react';
import {
  getDestinationsForObjective,
  normalizeObjective,
  objectiveSupportsSocial
} from '../../utils/smmDestinations';
import { MessageCircle, PhoneCall, Instagram, Facebook, Smartphone, FileSpreadsheet, Check, Sparkles, Target } from '@/components/ui/muiIcons';

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
    if (v.includes('message')) return <MessageCircle size={14} className="text-foreground" />;
    if (v.includes('call')) return <PhoneCall size={14} className="text-foreground" />;
    if (v === 'instagram') return <Instagram size={14} className="text-foreground" />;
    if (v === 'facebook') return <Facebook size={14} className="text-foreground" />;
    if (v.includes('instagram & facebook')) return <Sparkles size={14} className="text-foreground" />;
    if (v.includes('app')) return <Smartphone size={14} className="text-foreground" />;
    if (v.includes('instant form')) return <FileSpreadsheet size={14} className="text-foreground" />;
    return <Target size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="p-4 bg-secondary/30 rounded-2xl space-y-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <label className="font-semibold text-foreground text-sm inline-flex items-center gap-1.5">
          <MessageCircle size={14} className="text-foreground shrink-0" /> <span>{label}</span>
        </label>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-card text-foreground">
          Objective: {normObj}
        </span>
      </div>

      {/* Main Dropdown */}
      <select
        value={value}
        onChange={(e) => handleSelectPrimary(e.target.value)}
        className="app-select"
        required
      >
        <option value="">-- Select Destination --</option>
        {destinations.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* Social Multi-Select Pills (Only active when objective supports Instagram / Facebook) */}
      {supportsSocial && (
        <div className="p-2.5 rounded-xl bg-background space-y-2">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-semibold text-foreground inline-flex items-center gap-1.5 min-w-0">
              <Smartphone size={12} className="shrink-0" />
              <span>Social Destination:</span>
              <span className="text-muted-foreground font-normal truncate">(Select Instagram, Facebook, or both)</span>
            </span>
            {isSocialActive && (
              <span className="text-[10px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shrink-0">
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
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isInstagramSelected
                  ? 'bg-secondary text-foreground '
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Instagram size={15} className={isInstagramSelected ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Instagram</span>
              </div>
              <div className={`w-4 h-4 rounded flex items-center justify-center ${
                isInstagramSelected ? 'bg-primary text-primary-foreground' : ''
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
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isFacebookSelected
                  ? 'bg-secondary text-foreground '
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Facebook size={15} className={isFacebookSelected ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Facebook</span>
              </div>
              <div className={`w-4 h-4 rounded flex items-center justify-center ${
                isFacebookSelected ? 'bg-primary text-primary-foreground' : ''
              }`}>
                {isFacebookSelected && <Check size={11} strokeWidth={3} />}
              </div>
            </button>
          </div>

          {/* Quick preset buttons for Instagram & Facebook */}
          <div className="flex items-center justify-between pt-1 text-[10px]">
            <span className="text-muted-foreground">Quick Select:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange('Instagram', ['Instagram'])}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  value === 'Instagram'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent '
                }`}
              >
                Only IG
              </button>
              <button
                type="button"
                onClick={() => onChange('Facebook', ['Facebook'])}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  value === 'Facebook'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent '
                }`}
              >
                Only FB
              </button>
              <button
                type="button"
                onClick={() => onChange('Instagram & Facebook', ['Instagram', 'Facebook'])}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  value === 'Instagram & Facebook'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground border-transparent '
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
