# Deploying Easy Learn to the Fuse VPS (prepared, not yet executed)

Follows `/srv/fuse/README.md` ("Add an application"). Target: `https://learn.fuseservice.cloud`.

## One-time setup

1. **DNS** — add an A record `learn` → `179.198.211.5` (Hostinger DNS for `fuseservice.cloud`).
2. **Directories**
   ```sh
   mkdir -p /srv/fuse/apps/easy-learn/src /srv/fuse/data/easy-learn/{home,postgres}
   chown -R 10010:10010 /srv/fuse/data/easy-learn/home
   ```
3. **Network** — `docker network create --internal easy-learn-edge` (confirm no subnet overlap).
4. **Files** — copy `deploy/vps/compose.yaml` to `/srv/fuse/apps/easy-learn/compose.yaml`, create `.env` from
   `deploy/vps/env.example` (mode 0600), and upload the source (without `.git`, `node_modules`, `.next`, `data`,
   `.env*`) to `/srv/fuse/apps/easy-learn/src/`.
5. **Gateway** — copy `easy-learn.caddy` to `/srv/fuse/platform/gateway/sites/`, add the external network
   `easy-learn: { external: true, name: easy-learn-edge }` to the gateway compose file and to the caddy service's
   networks, validate (`caddy validate`), then `docker compose up -d --wait` in the gateway directory.
6. **Start** — in `/srv/fuse/apps/easy-learn`: `docker compose build --pull && docker compose up -d --wait`.
7. **Owner account** — open `https://learn.fuseservice.cloud/setup?token=<SETUP_TOKEN>` once; registration closes
   automatically. Then remove nothing — the token is useless once an account exists.
8. **Sign the CLIs in** (owner only, your own subscriptions):
   ```sh
   cd /srv/fuse/apps/easy-learn
   docker compose exec -it web codex login --device-auth
   docker compose exec -it web claude      # then type /login and follow the link
   ```
9. **Fuse Manage** — register `easy-learn` in `src/catalog.py` (service `web`, probe `/api/health`) and redeploy the
   dashboard image.

## Updates

Upload reviewed source, set a NEW `EASY_LEARN_IMAGE` tag, `docker compose build --pull && docker compose up -d --wait`.
Migrations run automatically at start. Roll back by restoring the previous tag and `up -d --no-build --wait`.
Back up `/srv/fuse/data/easy-learn/postgres` (pg_dump) before schema changes.
