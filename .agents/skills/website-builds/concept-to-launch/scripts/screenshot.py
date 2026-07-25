#!/usr/bin/env python3
"""Capture QA screenshots of a web page at multiple viewports.

For each viewport, saves an above-the-fold shot and a full-page shot, and
records console errors, page errors, failed requests, and horizontal
overflow into manifest.json. Built for the concept-to-launch G4 loop:
capture -> view images -> fix -> re-capture.

Usage:
    python3 screenshot.py <url> [--out DIR] [--wait MS]
                          [--viewport NAME WxH]... [--no-full-page]
                          [--browser-path PATH]

Browser resolution order: --browser-path, $PLAYWRIGHT_CHROMIUM_PATH,
Playwright's bundled chromium, then common system paths.

Exit codes: 0 = captured, no page/console errors; 3 = captured but errors
recorded (see manifest); 1 = capture failed.
"""

import argparse
import json
import os
import sys

DEFAULT_VIEWPORTS = [("desktop", 1440, 900), ("mobile", 390, 844)]
SYSTEM_CHROMIUM = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
]


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("url", help="Page URL (http(s):// or file://)")
    p.add_argument("--out", default="./qa", help="Output directory (default ./qa)")
    p.add_argument("--wait", type=int, default=1200, help="Extra settle wait in ms after load (default 1200)")
    p.add_argument("--viewport", nargs=3, action="append", metavar=("NAME", "W", "H"),
                   help="Custom viewport, repeatable. Default: desktop 1440x900 + mobile 390x844")
    p.add_argument("--no-full-page", action="store_true", help="Skip full-page screenshots")
    p.add_argument("--browser-path", help="Path to a chromium/chrome binary")
    return p.parse_args()


def launch_browser(playwright, explicit):
    attempts = []
    if explicit:
        attempts.append(explicit)
    attempts.append(None)  # Playwright's bundled chromium
    attempts.extend(c for c in SYSTEM_CHROMIUM if os.path.exists(c))
    seen, errors = set(), []
    for path in attempts:
        if path in seen:
            continue
        seen.add(path)
        try:
            kwargs = {"headless": True}
            if path:
                kwargs["executable_path"] = path
            browser = playwright.chromium.launch(**kwargs)
            print(f"browser: {path or 'playwright-bundled chromium'}", file=sys.stderr)
            return browser
        except Exception as e:  # noqa: BLE001 - report and try next candidate
            errors.append(f"{path or 'bundled'}: {str(e).splitlines()[0] if str(e) else type(e).__name__}")
    print("Could not launch a browser. Tried:\n  " + "\n  ".join(errors), file=sys.stderr)
    print("Fix: pip install playwright && python3 -m playwright install chromium\n"
          "or: --browser-path /usr/bin/chromium (or set PLAYWRIGHT_CHROMIUM_PATH)", file=sys.stderr)
    sys.exit(1)


def main():
    args = parse_args()
    viewports = DEFAULT_VIEWPORTS
    if args.viewport:
        viewports = [(n, int(w), int(h)) for n, w, h in args.viewport]
    os.makedirs(args.out, exist_ok=True)
    explicit = args.browser_path or os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright not installed. Fix: pip install playwright && python3 -m playwright install chromium",
              file=sys.stderr)
        sys.exit(1)

    manifest = {"url": args.url, "shots": [], "console_errors": [], "console_warnings": [],
                "page_errors": [], "failed_requests": [], "overflowX": {}}

    with sync_playwright() as pw:
        browser = launch_browser(pw, explicit)
        for name, w, h in viewports:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)

            def on_console(msg):
                entry = {"viewport": name, "text": msg.text[:500]}
                if msg.type == "error":
                    manifest["console_errors"].append(entry)
                elif msg.type == "warning":
                    manifest["console_warnings"].append(entry)

            page.on("console", on_console)
            page.on("pageerror", lambda e: manifest["page_errors"].append({"viewport": name, "text": str(e)[:500]}))
            page.on("requestfailed", lambda r: manifest["failed_requests"].append(
                {"viewport": name, "url": r.url[:300], "error": (r.failure or "")[:200] if isinstance(r.failure, str) else str(r.failure)[:200]}))

            try:
                page.goto(args.url, wait_until="networkidle", timeout=15000)
            except Exception:  # noqa: BLE001 - networkidle can hang with analytics; fall back to load
                page.goto(args.url, wait_until="load", timeout=30000)
            page.wait_for_timeout(args.wait)

            manifest["overflowX"][name] = page.evaluate(
                "() => ({overflow: document.documentElement.scrollWidth > window.innerWidth, "
                "scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth})")

            fold = os.path.join(args.out, f"{name}-fold.png")
            page.screenshot(path=fold)
            manifest["shots"].append(fold)
            if not args.no_full_page:
                full = os.path.join(args.out, f"{name}-full.png")
                page.screenshot(path=full, full_page=True)
                manifest["shots"].append(full)
            page.close()
        browser.close()

    manifest_path = os.path.join(args.out, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"shots: {len(manifest['shots'])} -> {args.out}/")
    for s in manifest["shots"]:
        print(f"  {s}")
    print(f"manifest: {manifest_path}")
    errs = len(manifest["console_errors"]) + len(manifest["page_errors"])
    overflow = [k for k, v in manifest["overflowX"].items() if v.get("overflow")]
    print(f"console/page errors: {errs}; failed requests: {len(manifest['failed_requests'])}; "
          f"horizontal overflow: {','.join(overflow) if overflow else 'none'}")
    print("NEXT: view every PNG before approving. The manifest is not a substitute for looking.")
    sys.exit(3 if errs else 0)


if __name__ == "__main__":
    main()
