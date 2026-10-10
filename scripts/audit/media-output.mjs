import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { parseCdnBuildRecord, resolveMediaUrl } from '../cdn-config.mjs';

export function auditMediaHtml(html, config, siteUrl) {
  const root = parse(html);
  let media = 0;
  function check(value, location) {
    if (!value) return;
    const expected = resolveMediaUrl(value, config, siteUrl);
    assert.equal(value, expected, `Unresolved owned media at ${location}: ${value}`);
    if (value.startsWith('/uploads/') || value.startsWith(`${new URL(siteUrl).origin}/uploads/`) || (config.mediaUrl && value.startsWith(`${config.mediaUrl}/uploads/`))) media += 1;
  }
  for (const node of root.querySelectorAll('img,source,video,a,link,meta')) {
    if (['IMG', 'SOURCE'].includes(node.tagName)) {
      check(node.getAttribute('src'), `${node.tagName}.src`);
      for (const candidate of (node.getAttribute('srcset') || '').split(',')) check(candidate.trim().split(/\s+/)[0], `${node.tagName}.srcset`);
    }
    if (node.tagName === 'VIDEO') check(node.getAttribute('poster'), 'video.poster');
    if (node.tagName === 'A') check(node.getAttribute('href'), 'a.href');
    if (node.tagName === 'LINK' && node.getAttribute('rel') === 'preload' && node.getAttribute('as') === 'image') check(node.getAttribute('href'), 'preload.href');
    if (node.tagName === 'META' && ['og:image', 'twitter:image'].includes(node.getAttribute('property'))) check(node.getAttribute('content'), 'social.image');
  }
  function images(value) {
    if (typeof value === 'string') check(value, 'JSON-LD.image');
    else if (Array.isArray(value)) value.forEach(images);
    else if (value && typeof value === 'object') images(value.url ?? value.contentUrl);
  }
  function visit(value) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key === 'image' || key === 'logo') images(child);
      else visit(child);
    }
  }
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) visit(JSON.parse(script.textContent));
  return { media };
}

export function auditMediaBuild(directory, siteUrl) {
  const config = parseCdnBuildRecord(JSON.parse(readFileSync(join(directory, '__bunny_config.json'), 'utf8')));
  assert.equal(readFileSync(join(directory, '__moderaty_commit.txt'), 'utf8').trim(), config.commit);
  let pages = 0;
  let media = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      // Tina admin assets are not website media; the picker keeps saved paths.
      if (entry.name === 'admin') continue;
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const result = auditMediaHtml(readFileSync(file, 'utf8'), config, siteUrl);
        pages += 1;
        media += result.media;
      }
    }
  }
  walk(directory);
  return { mode: config.mode, pages, media };
}
