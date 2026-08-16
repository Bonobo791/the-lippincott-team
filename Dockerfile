# Coolify / Docker deployment image for the TinaCMS + Astro site.
#
# Coolify: use the "Dockerfile" build pack (Dockerfile location: /Dockerfile).
# Environment variables set on the Coolify app are injected as --build-arg at
# build time (the "Build Variable" flag, on by default) and as container env
# at runtime. Coolify's proxy passes PORT (Ports Exposes) and HOST.
#
# Build needs TinaCloud credentials (PUBLIC_TINA_CLIENT_ID, TINA_TOKEN) and a
# canonical SITE_URL; it fails fast with ERR_MISSING_CLOUD_CREDS otherwise.
# Runtime: adapter-node standalone server on $PORT (default 4321).

FROM node:22-alpine AS base
RUN npm install -g pnpm@10.34.5

# ---------- deps: install the full dependency tree ----------
FROM base AS deps
WORKDIR /app
# pnpm-workspace.yaml carries the allowBuilds allowlist (better-sqlite3,
# sharp, ...) — without it pnpm 10 blocks those native builds and the
# resulting node_modules is unusable in the build stage.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM base AS build
WORKDIR /app
# Declare defaults so plain `docker build` also works; Coolify passes these as
# --build-arg automatically (Build Variable flag, on by default). TINA_TOKEN
# is deliberately ARG-only: ARG values are visible to the RUN that consumes
# them but are not baked into image config or layer metadata the way ENV
# values are, so the credential cannot be recovered from the image.
ARG PUBLIC_TINA_CLIENT_ID=""
ARG TINA_TOKEN=""
ARG SITE_URL="https://lippincottteam.com"
ARG PUBLIC_GA_ID=""
# Coolify sets COOLIFY_BRANCH (Build Variable) — promote it to ENV so
# tina/config.ts branch detection sees it and staging builds don't fall
# back to `main`.
ARG COOLIFY_BRANCH=""
ENV PUBLIC_TINA_CLIENT_ID=$PUBLIC_TINA_CLIENT_ID \
    SITE_URL=$SITE_URL \
    PUBLIC_GA_ID=$PUBLIC_GA_ID \
    COOLIFY_BRANCH=$COOLIFY_BRANCH \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=4096
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# tinacms build (client codegen + admin + content index), then astro build.
# BUILD_SCRIPT override mirrors netlify.toml's per-context commands: use
# `build:preview` for staging apps when the branch's Tina schema is not
# indexed by TinaCloud yet (skips the cloud schema check; production client).
# Allowlisted rather than freely interpolated so a mis-set build arg cannot
# inject shell commands.
ARG BUILD_SCRIPT="build"
RUN case "$BUILD_SCRIPT" in \
      build|build:preview|build:local) ;; \
      *) echo "Invalid BUILD_SCRIPT: $BUILD_SCRIPT" >&2; exit 1 ;; \
    esac \
 && pnpm "$BUILD_SCRIPT"

# ---------- runtime ----------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321
COPY package.json pnpm-lock.yaml ./
# Production dependencies only: the standalone server bundle plus native
# modules (sharp) — drops the heavy devDependencies (playwright, tsc, React).
# pnpm-workspace.yaml carries the allowBuilds list so native builds still run.
COPY pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
# The generated Tina client + seeded content cache (tina/__generated__) are
# referenced by the /tina-island re-render endpoint at runtime.
COPY --from=build /app/tina ./tina
# Deploy tooling: the entrypoint purges the Bunny pull-zone cache on container
# start (Coolify starts a new container per deploy), then runs the server.
COPY scripts/deploy ./scripts/deploy
USER node
EXPOSE 4321
# Health check via node's built-in fetch — no curl/wget needed in the image.
# Coolify parses this HEALTHCHECK (it takes precedence over its UI checks) and
# gates Traefik routing / rolling updates on it.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/scripts/deploy/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
