#!/usr/bin/env python3
"""Capture desktop and mobile screenshots of a page for visual QA.

Usage:
    python3 screenshot.py <url> [--out DIR] [--browser-path PATH] [--wait MS]

Writes one full-page PNG per viewport plus a manifest.json (console
messages, page errors, failed requests) into the output directory.

Requires Playwright:
    pip install playwright && python3 -m playwright install chromium

Or point at an existing Chromium/Chrome binary with --browser-path or the
PLAYWRIGHT_CHROMIUM_PATH environment variable (the pip package is still
required in that case).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

VIEWPORTS = [
    {"name": "desktop", "width": 1440, "height": 900, "is_mobile": False},
    {"name": "mobile", "width": 390, "height": 844, "is_mobile": True},
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Capture desktop + mobile full-page screenshots for visual QA."
    )
    p.add_argument("url", help="Page URL to capture (include http:// or https://)")
    p.add_argument("--out", default=".launch/qa", help="Output directory (default: .launch/qa)")
    p.add_argument(
        "--browser-path",
        default=os.environ.get("PLAYWRIGHT_CHROMIUM_PATH"),
        help="Path to an existing Chromium/Chrome binary (env: PLAYWRIGHT_CHROMIUM_PATH)",
    )
    p.add_argument(
        "--wait",
        type=int,
        default=1500,
        help="Extra settle time in ms after load (default: 1500)",
    )
    return p.parse_args()


def make_handlers(viewport_name: str, manifest: dict):
    def on_console(msg) -> None:
        if msg.type in ("error", "warning"):
            manifest["console_messages"].append(
                {"viewport": viewport_name, "type": msg.type, "text": msg.text}
            )

    def on_pageerror(err) -> None:
        manifest["page_errors"].append({"viewport": viewport_name, "error": str(err)})

    def on_requestfailed(req) -> None:
        manifest["failed_requests"].append(
            {"viewport": viewport_name, "url": req.url, "failure": str(req.failure)}
        )

    return on_console, on_pageerror, on_requestfailed


def scroll_through(page) -> None:
    """Scroll to the bottom and back so lazy-loaded content renders."""
    page.evaluate(
        """async () => {
            await new Promise((resolve) => {
                let y = 0;
                const step = Math.max(window.innerHeight, 400);
                const timer = setInterval(() => {
                    y += step;
                    window.scrollTo(0, y);
                    if (y >= document.body.scrollHeight) {
                        clearInterval(timer);
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, 120);
            });
        }"""
    )


def main() -> int:
    args = parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit(
            "Playwright is not installed. Run:\n"
            "  pip install playwright && python3 -m playwright install chromium\n"
            "then re-run this script (optionally with --browser-path /path/to/chromium)."
        )

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "url": args.url,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "captures": [],
        "console_messages": [],
        "page_errors": [],
        "failed_requests": [],
    }

    launch_kwargs = {}
    if args.browser_path:
        launch_kwargs["executable_path"] = args.browser_path

    with sync_playwright() as pw:
        browser = pw.chromium.launch(**launch_kwargs)
        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                is_mobile=vp["is_mobile"],
                has_touch=vp["is_mobile"],
                device_scale_factor=2 if vp["is_mobile"] else 1,
            )
            page = context.new_page()
            on_console, on_pageerror, on_requestfailed = make_handlers(vp["name"], manifest)
            page.on("console", on_console)
            page.on("pageerror", on_pageerror)
            page.on("requestfailed", on_requestfailed)

            try:
                page.goto(args.url, wait_until="networkidle", timeout=30_000)
            except Exception:
                # Pages with long-lived connections may never go networkidle;
                # fall back to plain load and rely on --wait instead.
                page.goto(args.url, wait_until="load", timeout=60_000)
            page.wait_for_timeout(args.wait)
            scroll_through(page)
            page.wait_for_timeout(500)

            filename = f"{vp['name']}-{vp['width']}x{vp['height']}.png"
            page.screenshot(path=str(out_dir / filename), full_page=True)
            manifest["captures"].append(
                {
                    "viewport": vp["name"],
                    "width": vp["width"],
                    "height": vp["height"],
                    "file": filename,
                    "full_page": True,
                }
            )
            context.close()
        browser.close()

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    errors = [m for m in manifest["console_messages"] if m["type"] == "error"]
    print(f"Captured {len(manifest['captures'])} screenshots -> {out_dir}/")
    for capture in manifest["captures"]:
        print(f"  {capture['file']}")
    print(
        f"Console errors: {len(errors)} | page errors: {len(manifest['page_errors'])} "
        f"| failed requests: {len(manifest['failed_requests'])}"
    )
    print(f"Manifest: {manifest_path}")
    print("Next: view every PNG before calling the page done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
