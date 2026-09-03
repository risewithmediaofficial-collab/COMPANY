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
    { value: 'Message Destination', label: 'Message Destination', icon: '💬' },
    { value: 'Call', label: 'Call', icon: '📞' },
    { value: 'Instagram', label: 'Instagram', icon: '📷', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', icon: '👤', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', icon: '✨', isSocial: true, platform: 'Both' },
  ],
  Traffic: [
    { value: 'Message Destinations', label: 'Message Destinations', icon: '💬' },
    { value: 'Instagram', label: 'Instagram', icon: '📷', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', icon: '👤', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', icon: '✨', isSocial: true, platform: 'Both' },
    { value: 'Calls', label: 'Calls', icon: '📞' },
  ],
  Leads: [
    { value: 'Message', label: 'Message', icon: '💬' },
    { value: 'Instant Forms', label: 'Instant Forms', icon: '📋' },
  ],
  'App Promotion': [
    { value: 'App', label: 'App', icon: '📱' },
  ],
  Sales: [
    { value: 'Call', label: 'Call', icon: '📞' },
    { value: 'Message', label: 'Message', icon: '💬' },
    { value: 'App', label: 'App', icon: '📱' },
  ],
  'Page Engagement': [
    { value: 'Message', label: 'Message', icon: '💬' },
    { value: 'Calls', label: 'Calls', icon: '📞' },
    { value: 'Instagram', label: 'Instagram', icon: '📷', isSocial: true, platform: 'Instagram' },
    { value: 'Facebook', label: 'Facebook', icon: '👤', isSocial: true, platform: 'Facebook' },
    { value: 'Instagram & Facebook', label: 'Instagram & Facebook (Both)', icon: '✨', isSocial: true, platform: 'Both' },
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
