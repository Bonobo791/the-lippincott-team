import { parseCdnConfig, resolveMediaUrl } from '../../scripts/cdn-config.mjs';

// Vite replaces these public values at build time, including in SSR chunks.
export const cdnConfig = parseCdnConfig({
  PUBLIC_CDN_MODE: import.meta.env.PUBLIC_CDN_MODE,
  PUBLIC_MEDIA_URL: import.meta.env.PUBLIC_MEDIA_URL,
});

export function mediaUrl(value: string, siteUrl: string): string;
export function mediaUrl(value: string | null | undefined, siteUrl: string): string | undefined;
export function mediaUrl(value: string | null | undefined, siteUrl: string): string | undefined {
  return resolveMediaUrl(value, cdnConfig, siteUrl);
}
