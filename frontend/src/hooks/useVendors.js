import { useMemo, useState, useEffect, useCallback } from 'react';
import { useModuleExpenses, useSubscriptions } from './useFinance';

const DEFAULT_PRESET_VENDORS = [
  'Videographer',
  'Video Editor',
  'RJ',
  'VJ',
  'Graphic Designer',
  'Photographer',
  'Shoot Crew',
  'Lighting Tech',
  'Sound Engineer',
  'Voiceover Artist',
  'Drone Operator',
  'Saran Bro',
  'Printer / Merchandise',
  'Office Landlord',
  'Electricity / Utility',
  'Adobe Creative Cloud',
  'Google Workspace',
  'Meta Ads',
  'AWS',
  'Canva',
  'Figma',
];

const LOCAL_STORAGE_KEY = 'rwm_saved_vendors';

/**
 * useVendors:
 * Aggregates all previously recorded vendors across expenses, subscriptions,
 * saved browser cache, and agency preset roles into searchable dropdown options.
 * Once a user inputs a vendor anywhere in the app, recordVendor saves it so it
 * immediately appears across all vendor dropdowns.
 */
export const useVendors = (options = {}) => {
  const { data: expenses = [] } = useModuleExpenses({}, { enabled: options.enabled ?? true });
  const { data: subscriptions = [] } = useSubscriptions({ enabled: options.enabled ?? true });

  const [cachedVendors, setCachedVendors] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        setCachedVendors(stored ? JSON.parse(stored) : []);
      } catch {}
    };
    window.addEventListener('rwm-vendors-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('rwm-vendors-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const recordVendor = useCallback((vendorName) => {
    if (!vendorName || typeof vendorName !== 'string') return;
    const trimmed = vendorName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'unassigned') return;

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : [];
      if (!current.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
        const updated = [...current, trimmed];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        setCachedVendors(updated);
        window.dispatchEvent(new Event('rwm-vendors-changed'));
      }
    } catch {}
  }, []);

  const vendorOptions = useMemo(() => {
    const vendorMap = new Map();

    const addVendor = (name, origin = 'Existing Vendor') => {
      if (!name || typeof name !== 'string') return;
      const trimmed = name.trim();
      if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'unassigned') return;
      const key = trimmed.toLowerCase();
      if (!vendorMap.has(key)) {
        vendorMap.set(key, { name: trimmed, origin });
      }
    };

    // 1. From expenses database
    if (Array.isArray(expenses)) {
      expenses.forEach((e) => {
        const name = (e.payee || e.vendor || e.vendorName || '').trim();
        if (name) addVendor(name, e.category ? `Vendor • ${e.category}` : 'Recorded Vendor');
      });
    }

    // 2. From subscriptions database
    if (Array.isArray(subscriptions)) {
      subscriptions.forEach((s) => {
        const name = (s.vendor || s.serviceName || '').trim();
        if (name) addVendor(name, 'Software / Service Provider');
      });
    }

    // 3. User-added / cached vendors
    if (Array.isArray(cachedVendors)) {
      cachedVendors.forEach((v) => {
        addVendor(v, 'Previously Added Vendor');
      });
    }

    // 4. Default agency presets
    DEFAULT_PRESET_VENDORS.forEach((p) => {
      addVendor(p, 'Preset Role / Provider');
    });

    return Array.from(vendorMap.values()).map((v) => ({
      value: v.name,
      label: v.name,
      subLabel: v.origin,
    }));
  }, [expenses, subscriptions, cachedVendors]);

  return {
    vendorOptions,
    recordVendor,
  };
};

export default useVendors;
