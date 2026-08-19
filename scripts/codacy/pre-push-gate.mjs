#!/usr/bin/env node
/**
 * Codacy pre-push gate.
 *
 * Runs Codacy local analysis (via the official Codacy MCP server,
 * @codacy/codacy-mcp, spawned over stdio) on the repository, then blocks the
 * push when any *changed* file carries error-level (critical/major) findings.
 *
 * Usage: node pre-push-gate.mjs <repo-root> <changed-file>...
 * Exit 0 = allow push; 1 = block push.
 *
 * Talks plain JSON-RPC 2.0 (newline-delimited) to the MCP server — no SDK
 * dependency, so the hook stays self-contained. If the configured
 * CODACY_ACCOUNT_TOKEN is invalid, remote-synced analysis fails and the gate
 * retries once without a token (pure local mode). Degrades to "allow" (with a
 * warning) when the server is missing or analysis tooling fails, because a
 * broken tool must never brick pushes. Escape hatches: `git push --no-verify`
 * or CODACY_GATE_OFF=1.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync, rmSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = process.argv[2];
// Hoisted so the per-line/per-file hot paths never recompile them.
const LEADING_DOT_SLASH_RE = /^\.\//;
const LINE_SPLIT_RE = /\r?\n/;
const QUOTE_STRIP_RE = /^["']|["']$/g;
const changed = new Set((process.argv.slice(3) || []).map((f) => f.replace(LEADING_DOT_SLASH_RE, '')));
const log = (...a) => console.error('[codacy-gate]', ...a);

if (!ROOT || !existsSync(path.join(ROOT, '.git'))) {
  log('no repo root given; skipping gate');
  process.exit(0);
}
if (changed.size === 0) {
  log('no changed files; skipping gate');
  process.exit(0);
}

// --- resolve the global Codacy MCP server binary -----------------------------
let globalRoot;
try {
  globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
} catch {
  log('npm not found; skipping Codacy gate');
  process.exit(0);
}
// npm root -g -> <prefix>/lib/node_modules ; the bin lives at <prefix>/bin.
const serverBin = path.join(globalRoot, '..', '..', 'bin', 'codacy-mcp-server');
if (!existsSync(serverBin)) {
  log('@codacy/codacy-mcp is not installed globally; skipping Codacy gate');
  log('  install with: npm install -g @codacy/codacy-mcp');
  process.exit(0);
}

// --- optional token from the agent config (keeps analysis cloud-synced) ------
const env = { ...process.env };
let tokenConfigured = false;
try {
  const envFile = path.join(os.homedir(), '.prime', 'agent', 'codacy', 'server.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(LINE_SPLIT_RE)) {
      const eq = line.indexOf('=');
      const name = eq === -1 ? '' : line.slice(0, eq).trim();
      const m = name === 'CODACY_ACCOUNT_TOKEN' ? ['', line.slice(eq + 1)] : null;
      if (m?.[1]?.trim()) {
        env.CODACY_ACCOUNT_TOKEN = m[1].trim().replace(QUOTE_STRIP_RE, '');
        tokenConfigured = true;
      }
    }
  }
} catch { /* token is optional */ }

// --- preserve committed .codacy config (the runner regenerates it) -----------
const codacyDir = path.join(ROOT, '.codacy');
const configFiles = ['codacy.config.json', 'codacy.config.baseline.json', 'configure-codacy-summary.json'];
const backupDir = path.join(os.tmpdir(), `codacy-gate-${process.pid}`);
const backedUp = [];
mkdirSync(backupDir, { recursive: true });
for (const name of configFiles) {
  const target = path.join(codacyDir, name);
  if (existsSync(target)) {
    copyFileSync(target, path.join(backupDir, name));
    backedUp.push(name);
  }
}
const restoreConfig = () => {
  // Files that existed before analysis are restored; files Codacy generated
  // that were absent before are removed, so the working tree returns exactly
  // to its pre-push state (no stray untracked config after the gate runs).
  for (const name of configFiles) {
    const target = path.join(codacyDir, name);
    if (backedUp.includes(name)) {
      try { copyFileSync(path.join(backupDir, name), target); } catch { /* ignore */ }
    } else {
      try { rmSync(target, { force: true }); } catch { /* ignore */ }
    }
  }
  try { rmSync(backupDir, { recursive: true, force: true }); } catch { /* ignore */ }
};

// --- minimal MCP stdio client (JSON-RPC 2.0, newline-delimited) ---------------
function rpc(proc, rl, id, method, params) {
  return new Promise((resolve, reject) => {
    const onLine = (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.id === id) {
        rl.off('line', onLine);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    rl.on('line', onLine);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

// Bounded wait for one JSON-RPC response. Never hangs the push: a timeout,
// a child-process error, or a premature close rejects, and the caller
// degrades to "allow" on tooling failure (logged loudly).
function rpc(proc, rl, id, method, params, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      rl.off('line', onLine);
      proc.off('error', onError);
      proc.off('close', onClose);
    };
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };
    const onLine = (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.id === id) {
        if (msg.error) done(reject, new Error(msg.error.message || JSON.stringify(msg.error)));
        else done(resolve, msg.result);
      }
    };
    const onError = (err) => done(reject, new Error(`codacy MCP server error: ${err.message}`));
    const onClose = () => done(reject, new Error('codacy MCP server closed before responding'));
    const timer = setTimeout(() => done(reject, new Error(`codacy MCP server did not respond within ${timeoutMs}ms`)), timeoutMs);
    rl.on('line', onLine);
    proc.on('error', onError);
    proc.on('close', onClose);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '
');
  });
}

/** Spawn the server, run codacy_cli_analyze, kill the server. Returns {payload} or {error}. */
async function runAnalysis(useToken) {
  const proc = spawn(serverBin, [], {
    env: useToken ? env : { ...env, CODACY_ACCOUNT_TOKEN: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let rl = null;
  // The analysis runner streams a lot of per-tool progress to stderr; collapse
  // consecutive repeats so a 40s analysis doesn't bury the gate's verdict.
  let lastLine = null;
  let repeatCount = 0;
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    for (const line of chunk.split(LINE_SPLIT_RE)) {
      if (!line) continue;
      if (line === lastLine) {
        repeatCount += 1;
        continue;
      }
      if (repeatCount > 3) console.error(`   ... (${repeatCount} repeats)`);
      repeatCount = 0;
      lastLine = line;
      console.error(line);
    }
  });
  try {
    rl = readline.createInterface({ input: proc.stdout });
    await rpc(proc, rl, 1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'codacy-pre-push-gate', version: '1.0.0' },
    });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    log('analyzing repository (first run may download tool runtimes) ...');
    const result = await rpc(proc, rl, 2, 'tools/call', {
      name: 'codacy_cli_analyze',
      arguments: { rootPath: ROOT },
    });
    const text = result?.content?.[0]?.text;
    return { payload: text ? JSON.parse(text) : { success: false, output: 'empty response' } };
  } catch (err) {
    return { error: err };
  } finally {
    try { rl?.close(); } catch { /* ignore */ }
    try { proc.kill(); } catch { /* ignore */ }
    restoreConfig();
  }
}

let first = await runAnalysis(tokenConfigured);
if (first.error && tokenConfigured) {
  // A bad/revoked token can break remote-synced analysis; fall back to
  // tokenless local analysis before giving up on the gate.
  log('analysis with token failed (%s); retrying without token', first.error?.message || first.error);
  first = await runAnalysis(false);
}
if (first.error) {
  log('analysis failed (%s); allowing push (tooling error, not a finding)', first.error?.message || first.error);
  process.exit(0);
}

const payload = first.payload;
if (!payload.success) {
  if (tokenConfigured && /token|auth|credential|401|403/i.test(payload.output || '')) {
    log('analysis with token failed (%s); retrying without token', payload.output || 'unknown');
    const retried = await runAnalysis(false);
    if (retried.error) {
      log('analysis failed (%s); allowing push (tooling error, not a finding)', retried.error?.message || retried.error);
      process.exit(0);
    }
    if (retried.payload.success) {
      gateVerdict(Array.isArray(retried.payload.result) ? retried.payload.result : []);
    }
  }
  log('analysis failed: %s; allowing push (tooling error, not a finding)', payload.output || 'unknown');
  process.exit(0);
}

gateVerdict(payload.result || []);

/** Filter to error-level findings in changed files; block (exit 1) or allow. */
function gateVerdict(findings) {
  const blockers = findings.filter(
    (f) => f?.level === 'error' && changed.has(String(f.filePath || '').replace(LEADING_DOT_SLASH_RE, '')),
  );
  if (blockers.length === 0) {
    log('OK: no error-level Codacy findings in changed files');
    process.exit(0);
  }
  console.error('');
  console.error('Codacy gate: push blocked — %d error-level finding(s) in changed files:', blockers.length);
  for (const f of blockers) {
    let at = f.filePath;
    if (f.region) {
      const line = f.region.startLine ?? '?';
      const col = f.region.startColumn ? `:${f.region.startColumn}` : '';
      at = `${f.filePath}:${line}${col}`;
    }
    console.error(`  [${f.tool}] ${f.rule?.name || f.rule?.id || '?'}  ${at}`);
    console.error(`      ${f.message}`);
  }
  console.error('');
  console.error('Fix the findings above (or suppress the pattern in .codacy/), then push again.');
  console.error('Escape hatch: git push --no-verify  (or CODACY_GATE_OFF=1).');
  process.exit(1);
}
