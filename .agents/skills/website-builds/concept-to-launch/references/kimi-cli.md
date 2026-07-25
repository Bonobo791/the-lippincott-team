# Running this skill inside Kimi Code CLI (TUI or `kimi web`)

The `kimi web` subcommand opens Kimi Code CLI's browser UI (equivalent to `kimi server run --open`, default `http://127.0.0.1:5494`). Everything below applies identically to the TUI and the web UI; only the rendering differs (the web UI displays images inline in chat).

## Installing the skill

Unzip the `.skill` package (it is a zip) into a scanned skills directory:

| Scope | Directory |
|---|---|
| User, all projects (Kimi brand) | `~/.kimi/skills/concept-to-launch/` |
| User, all projects (newer Kimi Code CLI) | `~/.kimi-code/skills/concept-to-launch/` |
| User, cross-tool generic | `~/.config/agents/skills/concept-to-launch/` |
| Single project | `.kimi/skills/concept-to-launch/` or `.agents/skills/concept-to-launch/` |

Project-level paths resolve against the project root (nearest `.git` ancestor). Brand directories `~/.kimi/skills`, `~/.claude/skills`, `~/.codex/skills` are merged by default; kimi wins name clashes. After installing, start a new session. Invoke manually with `/skill:concept-to-launch` or let it auto-trigger from the description.

## Tooling model relevant to this pipeline

| Tool | Approval | Use in this pipeline |
|---|---|---|
| `Bash` | Requires approval | Running dev servers, builds, and `scripts/screenshot.py`. Choose "Allow for Session" at G3 so G3-G5 run uninterrupted (YOLO mode also works but trust it only in disposable environments). |
| `ReadMediaFile` | Auto-allowed | Viewing captured screenshots. The G4 loop: Bash-capture -> ReadMediaFile-view -> Edit-fix -> re-capture. |
| `AskUserQuestion` | Auto-allowed | G0-G2 sign-off rounds. |
| `Write` / `Edit` | Requires approval | `.launch/` artifacts and site code. |
| `Agent` | Auto-allowed | Optional: spawn a sub-agent for the G4 fix loop to keep the main context lean. |

`${KIMI_SKILL_DIR}` expands to this skill's directory in current versions, so the capture command is:

```bash
python3 "${KIMI_SKILL_DIR}/scripts/screenshot.py" http://localhost:3000 --out .launch/qa
```

If the placeholder does not expand (older version), substitute the absolute install path.

## Screenshot setup (first run only)

The pipeline's G4 stage needs Python Playwright plus a Chromium binary:

```bash
pip install playwright
python3 -m playwright install chromium   # downloads Playwright's own chromium
```

If browser download is blocked but a system browser exists, skip the second command and point the script at it (auto-detected for `/usr/bin/chromium`, `chromium-browser`, `google-chrome`):

```bash
python3 scripts/screenshot.py <url> --browser-path /usr/bin/chromium
# or persist: export PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium
```

No-code fallback if Python is unavailable: `npx playwright screenshot --full-page --viewport-size=1440,900 <url> shot.png` (one viewport per run; the bundled script is preferred - it does both viewports, fold + full-page, console-error capture, and a manifest in one pass).

## Alternative: Playwright MCP

If a Playwright MCP server is configured in `~/.kimi/config.toml`, G4 may use it instead of the script:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]
```

MCP screenshots default to a `.playwright-mcp/` output dir (configurable). Still required: view every image with ReadMediaFile before approving G4. The bundled script remains the recommended path because its manifest records console errors, page errors, failed requests, and horizontal overflow in one artifact.
