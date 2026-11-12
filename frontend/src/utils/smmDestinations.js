/**
 * SMM Campaign & AdSet Objective to Destination Mapping
 * Final Specifications:
 * - Awareness: Message Destination, Call, Instagram / FB (separate or both)
 * - Traffic: Message Destinations, Instagram / FB (separate or both), Calls
 * - Leads: Message, Instant Forms
 * - App Promotion: App
 * - Sales: Call, Message, App
 * - Page Engagement: Message, Calls, Instagram / FB (separate or both)
 */

export const SMM_OBJECTIVES = [
  'Awareness',
  'Traffic',
  'Leads',
  'App Promotion',
  'Sales',
  'Page Engagement',
];

export const OBJECTIVE_DESTINATIONS_MAP = {
  Awareness: [
    { value: 'Message Destination', label: 'Message Destination', iconName: 'MessageCircle' },
    { value: 'Call', label: 'Call', iconName: 'PhoneCall' },
    { value: 'Instagram', label: 'Instagram', iconName: 'Instagram', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', iconName: 'Facebook', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', iconName: 'Sparkles', isSocial: true, platform: 'Both' },
  ],
  Traffic: [
    { value: 'Message Destinations', label: 'Message Destinations', iconName: 'MessageCircle' },
    { value: 'Instagram', label: 'Instagram', iconName: 'Instagram', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', iconName: 'Facebook', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', iconName: 'Sparkles', isSocial: true, platform: 'Both' },
    { value: 'Calls', label: 'Calls', iconName: 'PhoneCall' },
  ],
  Leads: [
    { value: 'Message', label: 'Message', iconName: 'MessageCircle' },
    { value: 'Instant Forms', label: 'Instant Forms', iconName: 'FileSpreadsheet' },
  ],
  'App Promotion': [
    { value: 'App', label: 'App', iconName: 'Smartphone' },
  ],
  Sales: [
    { value: 'Call', label: 'Call', iconName: 'PhoneCall' },
    { value: 'Message', label: 'Message', iconName: 'MessageCircle' },
    { value: 'App', label: 'App', iconName: 'Smartphone' },
  ],
  'Page Engagement': [
    { value: 'Message', label: 'Message', iconName: 'MessageCircle' },
    { value: 'Calls', label: 'Calls', iconName: 'PhoneCall' },
    { value: 'Instagram', label: 'Instagram', iconName: 'Instagram', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', iconName: 'Facebook', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', iconName: 'Sparkles', isSocial: true, platform: 'Both' },
  ],
};

export const normalizeObjective = (obj = '') => {
  const norm = String(obj || '').trim().toLowerCase();
  if (norm === 'awareness' || norm === 'reach') return 'Awareness';
  if (norm === 'traffic' || norm === 'website traffic') return 'Traffic';
  if (norm === 'leads' || norm === 'lead generation') return 'Leads';
  if (norm === 'app promotion' || norm === 'app' || norm === 'app install') return 'App Promotion';
  if (norm === 'sales' || norm === 'conversions') return 'Sales';
  if (norm === 'page engagement' || norm === 'engagement' || norm === 'messages' || norm === 'video views') {
    return 'Page Engagement';
  }
  return 'Awareness';
};

export const getDestinationsForObjective = (objective = '') => {
  const key = normalizeObjective(objective);
  return OBJECTIVE_DESTINATIONS_MAP[key] || OBJECTIVE_DESTINATIONS_MAP.Awareness;
};

export const objectiveSupportsSocial = (objective = '') => {
  const key = normalizeObjective(objective);
  return ['Awareness', 'Traffic', 'Page Engagement'].includes(key);
};
