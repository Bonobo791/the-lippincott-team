# Kimi Code CLI specifics

Read this when running concept-to-launch inside Kimi Code CLI (including the
`kimi web` browser UI).

## Skill install locations

- Project scope: `<project>/.agents/skills/<skill-name>/SKILL.md`
- User scope (all projects): `~/.agents/skills/<skill-name>/SKILL.md`
- Plugin-managed: `~/.kimi-code/plugins/managed/<plugin>/skills/<skill-name>/SKILL.md`

Each skill is a directory containing a `SKILL.md` with YAML frontmatter
(`name`, `description`). The skill listing is built when a session starts:
a skill added mid-session is picked up by the NEXT session. In the current
session, read the SKILL.md file directly and follow it.

## Invoking

Use the `Skill` tool with the skill name (`concept-to-launch`). If it does not
appear in this session's listing yet, `Read` the SKILL.md path instead.

## Approvals

- **Bash** (running the dev server, the screenshot script, pip installs)
  requires user approval. Suggest "Allow for Session" so the G3-G5 autonomous
  stretch is not interrupted gate-by-gate.
- **ReadMediaFile** (viewing screenshot PNGs) is auto-allowed — view every PNG
  directly, no extra permission needed.

## Screenshot setup

The QA script needs the Playwright Python package plus a Chromium binary.

Preferred: an isolated virtualenv (keeps the project's own env clean). Put it
inside `.launch/` so it is clearly scratch state, and do not commit it:

```bash
python3 -m venv .launch/qa-venv
.launch/qa-venv/bin/pip install playwright
.launch/qa-venv/bin/python -m playwright install chromium   # downloads to ~/.cache/ms-playwright
.launch/qa-venv/bin/python <skill-dir>/scripts/screenshot.py http://localhost:4321 --out .launch/qa
```

`<skill-dir>` is the directory containing this skill's SKILL.md
(`.agents/skills/website-builds/concept-to-launch` for a project-scope
install). `${KIMI_SKILL_DIR}` expands to it when the skill is loaded.

Using an existing browser instead of downloading Chromium (the pip package is
still required):

```bash
python3 <skill-dir>/scripts/screenshot.py http://localhost:4321 --out .launch/qa \
  --browser-path /usr/bin/chromium
# or once per shell:
export PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium
```

Serving the site: run the project's dev server in the background
(`run_in_background=true`), or `python3 -m http.server` from the output
directory for single-file/static HTML.

## Playwright MCP alternative

If a Playwright MCP server is configured in the harness, its browser tools can
replace the script: navigate, resize to 1440x900 and 390x844, take screenshots,
and SAVE them as PNGs into `.launch/qa/`. The requirements do not change:
files on disk, viewed via ReadMediaFile, at both widths.

## If nothing works

On a locked-down machine where neither Playwright nor a Chromium binary can be
installed: stop and tell the user. Per the hard rules, visual QA is never
faked and a site is never declared done from reading code alone.
