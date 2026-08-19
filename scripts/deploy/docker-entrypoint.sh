#!/bin/sh
# Container entrypoint (Coolify/Docker):
# 1. Start the real server command (CMD) in the background.
# 2. Wait until it serves the site locally (the same probe the HEALTHCHECK
#    uses, so "serving" here means the same readiness Traefik gates on).
# 3. OPT-IN cache purge: only when BUNNY_PURGE_ON_START=true AND credentials
#    are configured, purge the Bunny pull-zone cache — AFTER the new container
#    passed the readiness probe. Off by default: the CI workflow
#    (.github/workflows/bunny-purge.yml) is the primary deploy-time purge
#    trigger (it waits for /__moderaty_commit.txt to serve the pushed commit,
#    then purges with the key from repository secrets, outside the container).
#    This flag is the LAST-RESORT path for hosts where CI cannot run — never
#    enable it alongside the CI workflow (one purge per deploy event).
#    The readiness wait stays the gold standard for whichever purge does run:
#    purging first (the old behavior) let requests routed to the still-healthy
#    old container repopulate the cache with the previous release before
#    traffic switched over, and purging after a failed probe would clear the
#    edge cache without a serving container to refill it. Purge failures are
#    non-fatal (stale edge cache heals on its own; the site must still start).
# 4. Foreground the server and forward termination signals to it.
set -e

PORT="${PORT:-4321}"

"$@" &
server_pid=$!

trap 'kill "$server_pid" 2>/dev/null || true' TERM INT

ready=0
i=0
while [ "$i" -lt 60 ]; do
	if node -e "fetch('http://127.0.0.1:${PORT}/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
		ready=1
		break
	fi
	i=$((i + 1))
	sleep 1
done

if [ "$ready" -eq 0 ]; then
	echo '[entrypoint] WARN: server not ready after 60s; skipping cache purge' >&2
fi

purge_on_start="${BUNNY_PURGE_ON_START:-}"
case "$purge_on_start" in
	true|1|yes|on) purge_on_start=1 ;;
	*) purge_on_start=0 ;;
esac

if [ "$purge_on_start" -eq 1 ]; then
	if [ "$ready" -eq 1 ]; then
		if [ -n "${BUNNY_API_KEY:-}" ] && [ -n "${BUNNY_PULL_ZONE_ID:-}" ]; then
			node /app/scripts/bunny-purge.mjs || echo '[bunny-purge] WARN: purge failed; continuing'
		else
			echo '[entrypoint] BUNNY_PURGE_ON_START=true but BUNNY_API_KEY/BUNNY_PULL_ZONE_ID not set; skipping cache purge' >&2
		fi
	fi
elif [ -n "${BUNNY_API_KEY:-}" ] || [ -n "${BUNNY_PULL_ZONE_ID:-}" ]; then
	# Credentials are configured but the purge is off: surface the mismatch
	# instead of silently never purging. Deploy-time purges run from CI
	# (.github/workflows/bunny-purge.yml) with the key in repository secrets —
	# for hosts without CI, set BUNNY_PURGE_ON_START=true.
	echo '[entrypoint] Bunny purge credentials are set but BUNNY_PURGE_ON_START is not true; deploy-time purges run from CI. Set BUNNY_PURGE_ON_START=true only for hosts without CI.' >&2
fi

wait "$server_pid"
