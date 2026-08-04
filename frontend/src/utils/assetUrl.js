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

  // If page is HTTPS and asset URL is insecure http://.../uploads/..., strip insecure origin to avoid Mixed Content
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (/^http:\/\//i.test(normalized) && normalized.includes('/uploads/')) {
      const uploadPath = normalized.substring(normalized.indexOf('/uploads/'));
      return `${window.location.origin}${uploadPath}`;
    }
  }

  if (/^(blob:|data:|https?:\/\/)/i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/uploads/')) {
    return `${getApiOrigin()}${normalized}`;
  }
  if (normalized.startsWith('uploads/')) {
    return `${getApiOrigin()}/${normalized}`;
  }
  return normalized;
};
