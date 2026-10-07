export interface CdnConfig { mode: 'full-site' | 'media-only'; mediaUrl: string | null }
export interface CdnBuildRecord extends CdnConfig { version: 1; commit: string }
export function parseCdnConfig(env: Record<string, string | undefined>): CdnConfig;
export function resolveMediaUrl(value: string | null | undefined, config: CdnConfig, siteUrl: string): string | undefined;
export function parseCdnBuildRecord(value: unknown): CdnBuildRecord;
