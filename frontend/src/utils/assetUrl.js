const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export const getApiOrigin = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (configuredUrl) {
      const cleanUrl = trimTrailingSlash(configuredUrl).replace(/\/api$/, '');
      if (cleanUrl.startsWith('https://')) {
        return cleanUrl;
      }
      return window.location.origin;
    }
    return window.location.origin;
  }

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl).replace(/\/api$/, '');
  }

  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const getAssetUrl = (url) => {
  if (!url) return '';

  const normalized = url.replace(/\\/g, '/');

  // Handle uploaded assets by routing through /api/uploads/ which is proxied by Nginx over HTTPS
  if (normalized.includes('/uploads/') || normalized.startsWith('uploads/')) {
    const uploadIndex = normalized.indexOf('uploads/');
    const relativePath = normalized.substring(uploadIndex);
    return `/api/${relativePath}`;
  }

  if (/^(blob:|data:|https?:\/\/)/i.test(normalized)) {
    return normalized;
  }

  return normalized;
};
