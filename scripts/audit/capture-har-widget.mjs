#!/usr/bin/env node
/**
 * Capture the rendered HAR widget page for QA routing.
 *
 * The widget URL (https://www.har.com/mopx_services/realtor-agent-rating)
 * is PerimeterX-gated: scripted/headless loads get the bot-check page and
 * never the widget. This script opens the URL as a document navigation in
 * a real (headed) browser so HAR's challenge can complete — a human solves
 * the captcha if HAR asks — then saves the rendered page HTML to
 * `.launch/qa/reviews/har-widget-capture.html`. `shoot.mjs` routes
 * `**\/mopx_services/**` requests to that file so headless screenshot runs
 * can render the feed without touching PerimeterX.
 *
 * Usage (from repo root, on a machine with a display):
 *   node scripts/audit/capture-har-widget.mjs            # headed capture
 *   node scripts/audit/capture-har-widget.mjs --file saved.html
 *                                                        # adopt a manually
 *                                                        # saved page (your
 *                                                        # browser → Save As)
 *
 * The capture is gitignored QA scratch, not shipped content. If the widget
 * is ever needed as a static fallback on the site, promote this file into
 * the repo instead.
 */

import { chromium } from 'playwright';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDGET_URL =
  'https://www.har.com/mopx_services/realtor-agent-rating?member_number=586048&bg=999999&showcat=y&showcomments=y';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(here, '..', '..', '.launch', 'qa', 'reviews');
const OUT_FILE = path.join(OUT_DIR, 'har-widget-capture.html');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const adoptFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

function looksLikeWidget(html) {
  // The challenge page carries the PX bootstrap; the widget page does not.
  return html.length > 2000 && !/_pxAppId|px-captcha|PX1aZz2FHJ/i.test(html);
}

async function adopt() {
  const html = await readFile(adoptFile, 'utf8');
  if (!looksLikeWidget(html)) {
    console.error('[capture] the saved file still looks like the PX challenge page — save it AFTER the widget renders.');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  await copyFile(adoptFile, OUT_FILE);
  console.log(`[capture] adopted ${adoptFile} → ${OUT_FILE}`);
}

async function headed() {
  await mkdir(OUT_DIR, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: false });
    console.log('[capture] using system Chrome');
  } catch {
    browser = await chromium.launch({ headless: false });
    console.log('[capture] system Chrome unavailable — using bundled Chromium (PX may keep it challenged)');
  }

  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  console.log('[capture] opening the widget URL — solve the HAR bot check if one appears…');
  await page.goto(WIDGET_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});

  // Poll until the widget (not the challenge) renders. Give a human up to
  // 5 minutes to solve a captcha; the widget page carries none of the PX
  // markers and has real content.
  const deadline = Date.now() + 5 * 60_000;
  let html = '';
  for (;;) {
    html = await page.content();
    if (looksLikeWidget(html)) break;
    if (Date.now() > deadline) {
      console.error('[capture] timed out after 5 minutes — the widget never rendered (captcha unsolved or PX still gated).');
      await browser.close();
      process.exit(1);
    }
    await page.waitForTimeout(2000);
  }
  // Let the widget settle (late document.write passes, images).
  await page.waitForTimeout(3000);
  html = await page.content();

  const measure = async (width, label) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(600);
    const height = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[capture] ${label} (${width}px wide): body height ${height}px — tune .home-v2 #har-feed iframe{height} in src/styles/v2.css against this`);
  };
  await measure(1200, 'desktop');
  await measure(375, 'mobile');

  await writeFile(OUT_FILE, html);
  console.log(`[capture] saved ${html.length} bytes → ${OUT_FILE}`);
  await browser.close();
}

if (adoptFile) await adopt();
else await headed();
