# syntax=docker/dockerfile:1.7
# Easy Learn: Next.js standalone server + in-process job runner + official Codex/Claude CLIs.

ARG NODE_IMAGE=node:22-bookworm-slim

# ---------- dependencies ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- build ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- official AI CLIs (pinned) ----------
FROM ${NODE_IMAGE} AS clis
ARG TARGETARCH
ARG CLAUDE_VERSION=2.1.286
ARG CLAUDE_SHA256_AMD64=fe503f65c6289d59c23e5b21ae44f03583f997dd33a2cbfc75ab4f96fb8fc73f
ARG CLAUDE_SHA256_ARM64=0292fa22ac2fd43e16be9d0e511ddd8347280d6e0ebaca744ef5b27e05d8d0f8
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/clis
COPY docker/clis/package.json docker/clis/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
RUN set -eu; \
    case "${TARGETARCH:-$(dpkg --print-architecture)}" in \
      amd64) platform=linux-x64; sum="$CLAUDE_SHA256_AMD64" ;; \
      arm64) platform=linux-arm64; sum="$CLAUDE_SHA256_ARM64" ;; \
      *) echo "unsupported architecture" >&2; exit 1 ;; \
    esac; \
    curl -fsSL --retry 3 "https://downloads.claude.ai/claude-code-releases/${CLAUDE_VERSION}/${platform}/claude" -o /opt/clis/claude; \
    echo "${sum}  /opt/clis/claude" | sha256sum -c -; \
    chmod 0755 /opt/clis/claude

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 10010 app \
    && useradd -u 10010 -g app -d /data/home -s /usr/sbin/nologin app \
    && mkdir -p /data/home && chown 10010:10010 /data/home

COPY --from=clis /opt/clis /opt/clis
RUN ln -s /opt/clis/node_modules/.bin/codex /usr/local/bin/codex \
    && ln -s /opt/clis/claude /usr/local/bin/claude \
    && codex --version && claude --version

WORKDIR /app
COPY --from=build --chown=10010:10010 /app/.next/standalone ./
COPY --from=build --chown=10010:10010 /app/.next/static ./.next/static
COPY --from=build --chown=10010:10010 /app/public ./public
COPY --from=build --chown=10010:10010 /app/drizzle ./drizzle

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    HOME=/data/home \
    CLI_HOME=/data/home \
    MIGRATIONS_DIR=/app/drizzle \
    DISABLE_AUTOUPDATER=1

USER 10010:10010
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
