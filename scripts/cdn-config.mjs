// Shared, dependency-free build contract. Never read process.env here: callers
// explicitly supply build settings or validated deployed metadata.
export function parseCdnConfig(env) {
  const mode = env.PUBLIC_CDN_MODE?.trim() || 'full-site';
  if (!['full-site', 'media-only'].includes(mode)) {
    throw new Error('PUBLIC_CDN_MODE must be full-site or media-only');
  }
  if (mode === 'full-site') return { mode, mediaUrl: null };
  try {
    const url = new URL(env.PUBLIC_MEDIA_URL?.trim() || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return { mode, mediaUrl: url.origin };
  } catch {
    throw new Error('PUBLIC_MEDIA_URL must be an HTTPS origin without credentials, path, query or fragment');
  }
}

export function resolveMediaUrl(value, config, siteUrl) {
  if (value == null) return undefined;
  if (config.mode !== 'media-only') return value;
  let path = value;
  if (!value.startsWith('/')) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(siteUrl).origin || url.username || url.password) return value;
      // Retain the original spelling/encoding, rather than URL-normalized paths.
      path = value.replace(/^https?:\/\/[^/]+/i, '');
    } catch { return value; }
  }
  if (!path.startsWith('/uploads/')) return value;
  try {
    const pathname = path.split(/[?#]/, 1)[0];
    const decoded = decodeURIComponent(pathname);
    if (/[\\\x00-\x1f\x7f]/.test(decoded) || decoded.split('/').some(segment => segment === '.' || segment === '..')) return value;
  } catch { return value; }
  return `${config.mediaUrl}${path}`;
}

export function parseCdnBuildRecord(value) {
  try {
    if (!value || typeof value !== 'object' || value.version !== 1 || typeof value.commit !== 'string' || !/^[a-f0-9]{40}$/i.test(value.commit)) throw new Error();
    if (!['full-site', 'media-only'].includes(value.mode)) throw new Error();
    if (value.mode === 'full-site' && value.mediaUrl !== null) throw new Error();
    const config = parseCdnConfig({ PUBLIC_CDN_MODE: value.mode, PUBLIC_MEDIA_URL: value.mediaUrl });
    return { version: 1, commit: value.commit, ...config };
  } catch {
    throw new Error('Invalid Bunny build record');
  }
}
