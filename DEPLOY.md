# Deploying GSD Command Center (Raspberry Pi + Cloudflare Tunnel)

Self-contained Docker stack — Next.js app, Socket.IO server, PostgreSQL, and a
Cloudflare Tunnel — all on the Pi, reachable over HTTPS with no open ports.

```
Internet ──HTTPS──▶ Cloudflare ──tunnel──▶ cloudflared ─┬─▶ web:3000     (app)
                                                        └─▶ socket:3001  (/socket.io)
                                                            web+socket ──▶ db:5432
```

Everything lives on **one hostname**; the tunnel routes `/socket.io` to the
socket service so the session cookie (host-scoped) reaches both.

---

## 1. Prerequisites

**Hardware**
- Raspberry Pi 4 or 5. **4GB works** — but you *must* add swap before the first
  build (step 3a), or `next build` will be OOM-killed. 8GB is smoother.
- **Boot from a USB SSD, not an SD card.** Postgres write load will corrupt a
  cheap SD card over time — and the build swapfile lives on the SSD too.

**Software** (64-bit Raspberry Pi OS)
```bash
# Docker Engine + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then log out/in
docker compose version          # verify the plugin is present
```

**Cloudflare**
- A domain added to your Cloudflare account (free plan is fine).

---

## 2. Create the Cloudflare Tunnel

1. **Zero Trust** dashboard → **Networks → Tunnels → Create a tunnel** →
   *Cloudflared* → name it (e.g. `gsd`).
2. On the install screen, **copy the token** — the long string after `--token`.
   That's your `TUNNEL_TOKEN`. (You don't install the connector manually; the
   `cloudflared` container uses this token.)
3. Open the tunnel → **Public Hostname** tab and add **two entries, in this
   order** (order matters — the specific one first):

   | # | Subdomain | Domain | Path | Service |
   |---|-----------|--------|------|---------|
   | 1 | `gsd` | `yourdomain.com` | `socket.io` | `HTTP` → `socket:3001` |
   | 2 | `gsd` | `yourdomain.com` | *(blank)* | `HTTP` → `web:3000` |

   Cloudflare creates the DNS record automatically. The service hostnames
   (`web`, `socket`) resolve because `cloudflared` runs on the same Docker
   network as the app.

> The `/socket.io` route is what makes real-time chat work while keeping one
> origin (so the auth cookie is shared). Don't skip entry #1.

---

## 3. Configure & launch

> **Two ways to get the image onto the Pi:**
> **A) Build on the Pi** (below) — simplest, but a 4GB Pi needs swap (step 3a).
> **B) Let CI build it** (see *Option B* further down) — **recommended for 4GB**:
> GitHub builds the arm64 image and the Pi only pulls. Either way, do the `.env`
> setup in this section first.

```bash
git clone <your-repo> gsd && cd gsd/frontend   # or copy the project onto the Pi

cp .env.production.example .env
nano .env                                       # fill in every CHANGE_ME
#  - SESSION_SECRET:  openssl rand -base64 32
#  - POSTGRES_PASSWORD must match the one inside DATABASE_URL
#  - the three URL vars = your gsd.yourdomain.com
#  - TUNNEL_TOKEN from step 2

docker compose up -d --build                    # builds arm64 image ON the Pi
```

### 3a — Add swap first (required on a 4GB Pi)

The Next.js build peaks above 4GB. Add ~4GB of swap (on the SSD) **before**
building, or the build gets OOM-killed partway through:

```bash
sudo dphys-swapfile swapoff
# Raspberry Pi OS caps swap at CONF_MAXSWAP, so raise both:
sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=4096/; s/^#\?CONF_MAXSWAP=.*/CONF_MAXSWAP=4096/' /etc/dphys-swapfile
sudo dphys-swapfile setup && sudo dphys-swapfile swapon
free -h    # confirm ~4.0Gi under "Swap"
```

Then run `docker compose up -d --build`. On a 4GB Pi the first build is slow
(~15–25 min) and will lean on swap — that's expected. Runtime afterward is fine;
swap mostly sits idle once the app is serving.

The `web` service runs `prisma migrate deploy` automatically on start, so the
schema is created for you.

**Seed the first Owner account** (once):
```bash
docker compose exec web npm run seed
```

Open `https://gsd.yourdomain.com`, log in with the `OWNER_*` credentials, and
**change the password immediately**.

---

## Option B — CI build + pull (Pi never compiles)

Recommended for a 4GB Pi: GitHub Actions builds the arm64 image and pushes it to
GHCR; the Pi just pulls it. No on-Pi build, no swap gymnastics.

**On GitHub (one-time):**
1. Push this project to a GitHub repo. The workflow
   `.github/workflows/build-image.yml` is already included.
2. **Settings → Secrets and variables → Actions → Variables** → add a variable
   `NEXT_PUBLIC_SOCKET_URL` = `https://gsd.yourdomain.com` (your tunnel host).
   This is baked into the client bundle at build time.
3. Push to `master`/`main` (or run the workflow manually). It builds and pushes
   `ghcr.io/<youruser>/<repo>:latest`.
4. The GHCR package starts **private**. Keep it private (the image bundles your
   app code) and let the Pi authenticate — next step — or make it public under
   the package's settings if you don't mind it being world-readable.

**On the Pi:**
```bash
# 1. Authenticate to GHCR (private package). Create a GitHub PAT with the
#    read:packages scope, then:
echo "<YOUR_PAT>" | docker login ghcr.io -u <youruser> --password-stdin

# 2. In .env, set IMAGE to your pushed image (lowercase), plus the same values
#    from section 3. Then pull + run the prod compose (no build section):
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec web npm run seed   # first run only
```

**Updating later:** push to GitHub → CI rebuilds → on the Pi
`docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`
(`pull_policy: always` also refreshes on every `up`). Use the same
`-f docker-compose.prod.yml` for logs/backups from section 5.

> If you set `NEXT_PUBLIC_SOCKET_URL` after the first build, re-run the workflow
> — the old image still has the old value baked in.

## 4. Verify

```bash
docker compose ps                 # all services "running"/"healthy"
docker compose logs -f web        # watch for "migrate deploy" + Next ready
docker compose logs cloudflared   # should show "Registered tunnel connection"
```

In the app: log in (auth = HTTPS cookie working), open **Chat** and confirm the
connection shows LIVE (Socket.IO through the tunnel), and mint an inbound API
key under **Settings** for the n8n workflows.

---

## 5. Day-2 operations

**Update to a new version**
```bash
git pull
docker compose up -d --build      # rebuilds, re-runs migrations, restarts
```

**Back up** (do this on a schedule)
```bash
# Database
docker compose exec -T db pg_dump -U gsd command_center > gsd-$(date +%F).sql
# Uploaded files (Vault)
docker run --rm -v gsd-command-center_uploads:/data -v "$PWD":/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

**Restore the database**
```bash
cat gsd-YYYY-MM-DD.sql | docker compose exec -T db psql -U gsd -d command_center
```

**Logs / restart / stop**
```bash
docker compose logs -f            # all services
docker compose restart web
docker compose down               # stop (volumes/data preserved)
```

---

## 6. Troubleshooting

- **Login bounces back to /login (cookie not sticking).** The session cookie is
  `Secure`, so you must reach the app over **https://** (the tunnel does this).
  Don't test via `http://<pi-ip>:3000` — the cookie won't set there.
- **Server Action blocked / "invalid origin".** Set `GSD_ALLOWED_ORIGIN` to your
  exact hostname (e.g. `gsd.yourdomain.com`) and rebuild.
- **Chat won't connect.** Confirm Public Hostname entry #1 (`socket.io` →
  `socket:3001`) exists and sits above the catch-all; check
  `docker compose logs socket`.
- **Build OOMs on a 4GB Pi.** You skipped step 3a — add the swap and rebuild.
  If it still dies after swap, bound the build heap:
  `NODE_OPTIONS=--max-old-space-size=2560 docker compose build`, then
  `docker compose up -d`. Last resort: build the image on a stronger machine and
  `docker compose pull` on the Pi (ask me to set up the CI-build path).
- **`prisma migrate deploy` fails on first boot.** The DB may still be starting;
  `depends_on: service_healthy` usually covers it — otherwise
  `docker compose restart web`.

---

## Notes

- **Reminders worker** — runs as the `reminders` service (5th container). It
  polls for due task reminders and turns them into in-app notifications. No
  action needed; it starts with the stack. In local dev it's a separate process:
  `npm run reminders`.
- **n8n** — you self-host separately; point its Gmail workflows at
  `https://gsd.yourdomain.com/api/emails*` with an inbound API key (see
  `n8n/README.md`).
- **Voice notes** — the Voice Note Pipeline posts transcriptions to
  `https://gsd.yourdomain.com/api/voice-notes/ingest` (setup: `n8n/README.md`,
  "Voice Notes"). Each person generates their own voice key under **Profile**.
- **Installable app + push** — the site is a PWA (manifest, icons, service
  worker are built in). For push notifications, generate VAPID keys once and put
  them in `.env`, then `docker compose up -d`:
  ```bash
  docker compose exec web npx web-push generate-vapid-keys
  # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env, plus VAPID_SUBJECT=mailto:you@…
  ```
  Keep the keys stable — changing them silently breaks every existing device
  subscription (people just toggle notifications off/on in Profile to re-subscribe).
  On iPhone, push only works from the Home Screen app (Share → Add to Home Screen).
- **Time zone** — `APP_TIMEZONE` (default `Asia/Manila`) decides what "today"
  means for Home's *Due today* / *Up next*.
