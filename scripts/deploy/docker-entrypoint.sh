#!/bin/sh
# Container entrypoint (Coolify/Docker):
# 1. Purge the Bunny pull-zone cache when credentials are configured — a new
#    container starts on every Coolify deployment, so this keeps the CDN in
#    sync with each deploy. Purge failures are non-fatal (stale edge cache
#    heals on its own; the site must still start).
# 2. Start the real server command (CMD).
set -e

if [ -n "${BUNNY_API_KEY:-}" ] && [ -n "${BUNNY_PULL_ZONE_ID:-}" ]; then
	node /app/scripts/deploy/purge-bunny-cache.mjs || echo '[bunny-purge] WARN: purge failed; continuing'
fi

exec "$@"
