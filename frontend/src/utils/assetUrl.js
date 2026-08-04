const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export const getApiOrigin = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl).replace(/\/api$/, '');
  }

  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const getAssetUrl = (url) => {
  if (!url) return '';
  if (/^(blob:|data:|https?:\/\/)/i.test(url)) return url;

  const normalized = url.replace(/\\/g, '/');

  if (normalized.startsWith('/uploads/')) {
    return `${getApiOrigin()}${normalized}`;
  }
  if (normalized.startsWith('uploads/')) {
    return `${getApiOrigin()}/${normalized}`;
  }
  return normalized;
};
