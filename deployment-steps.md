# راهنمای استقرار / Deployment Guide — املاکبین

> این فایل را پرینت بگیر یا آفلاین نگه دار.
> You cannot access Claude when VPN is off. Follow this exactly as written.

---

## فهرست / Table of Contents

1. [Code changes already done](#1-code-changes-already-done)
2. [What to prepare before you start](#2-what-to-prepare-before-you-start)
3. [VPS initial setup — run once](#3-vps-initial-setup--run-once)
4. [PostgreSQL setup](#4-postgresql-setup)
5. [Nginx setup — both domains](#5-nginx-setup--both-domains)
6. [SSL certificates](#6-ssl-certificates)
7. [Deploy the app — first time (upload via rsync, no GitHub needed)](#7-deploy-the-app--first-time)
8. [Environment variables](#8-environment-variables)
9. [Database migration + seed admin](#9-database-migration--seed-admin)
10. [Start the app with PM2](#10-start-the-app-with-pm2)
11. [Cron job](#11-cron-job)
12. [Verify everything is working](#12-verify-everything-is-working)
13. [Every subsequent deploy (rsync from local machine)](#13-every-subsequent-deploy)
14. [Editing code after deployment](#14-editing-code-after-deployment)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Code changes already done

These were fixed in the codebase before you deploy — no action needed:

| File | Change | Why |
|------|--------|-----|
| `next.config.ts` | Added `output: "standalone"` | Required to build a self-contained server for VPS |
| `next.config.ts` | Added `outputFileTracingIncludes` for Prisma | Ensures the Prisma native query engine binary is included in the standalone build |
| `.env.example` | Removed `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seed-only credentials — env validator was incorrectly requiring them at runtime |
| `prisma.config.ts` | Contains `datasource.url` + dotenv import | Prisma v7 reads DATABASE_URL from `prisma.config.ts`, not from `schema.prisma` |

---

## 2. What to prepare before you start

Have all of these ready **before** touching the VPS. You will need them offline.

### VPS spec — capacity guide

| Spec | Handles | Notes |
|------|---------|-------|
| **2 vCPU / 8 GB RAM** | ~150–200 active offices | Good for launch. Photo uploads are single-threaded under Sharp — 2 cores is fine at low-to-mid load. |
| **4 vCPU / 8 GB RAM** | ~300–400 active offices | Recommended once you grow past 200 offices or if you have heavy concurrent photo uploads. |
| **4 vCPU / 16 GB RAM** | 400–600+ active offices | Upgrade to this if PostgreSQL starts to grow large (100K+ files). |

**Minimum to start:** 2 vCPU / 8 GB RAM — this is fine for launch. Upgrade to 4 vCPU when you hit consistent slowness on photo uploads.

**OS: Ubuntu 24.04 LTS** — Storage: 80 GB NVMe SSD — Bandwidth: 200 Mbps or higher

### Service accounts to create first:
- **Parspack (or IranServer)** account — VPS, PostgreSQL, Object Storage
- **KaveNegar** — get your API key from panel.kavenegar.com
- **Zarinpal** — get your Merchant ID from zarinpal.com (use sandbox first)
- **Neshan** — get API key from developer.neshan.org
- **AvalAI** — get API key from avalai.ir

### Domain setup (do this before VPS):
- Point your main domain (e.g. `amlakbin.ir`) A record → VPS IP
- Point share subdomain (e.g. `view.amlakbin.ir`) A record → same VPS IP
- DNS propagation takes 0–24 hours. Do this early.

### Object Storage bucket:
- Create an S3-compatible bucket on Parspack/IranServer
- Note down: endpoint URL, access key, secret key, bucket name
- Set bucket to **private** (not public) — the app serves files via signed URLs

### Collect all env var values now:
Fill this in before going offline:

```
DATABASE_URL=postgresql://amlakbin_user:YOUR_DB_PASSWORD@localhost:5432/amlakbin
NEXTAUTH_SECRET=   # generate: openssl rand -base64 32
NEXTAUTH_URL=https://amlakbin.ir
AVALAI_API_KEY=
NESHAN_API_KEY=
NEXT_PUBLIC_NESHAN_MAP_KEY=   # same value as NESHAN_API_KEY
KAVENEGAR_API_KEY=
ZARINPAL_MERCHANT_ID=   # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
STORAGE_ENDPOINT=https://s3.parspack.com   # or IranServer equivalent
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET_NAME=
NEXT_PUBLIC_SHARE_DOMAIN=https://view.amlakbin.ir
CRON_SECRET=   # generate: openssl rand -hex 32
```

> Replace `amlakbin` and `amlakbin.ir` with your actual app name and domain everywhere below.

---

## 3. VPS initial setup — run once

SSH into your VPS as root (Parspack gives you root access by default):

```bash
ssh root@YOUR_VPS_IP
```

### 3.1 Update system

```bash
apt update && apt upgrade -y
```

### 3.2 Install Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version   # should print v22.x.x
npm --version    # should print 10.x.x
```

### 3.3 Install system tools

```bash
apt install -y git nginx certbot python3-certbot-nginx ufw rsync
```

### 3.4 Install PM2 globally

```bash
npm install -g pm2
pm2 --version   # verify install
```

### 3.5 Create a non-root user (optional but recommended)

```bash
adduser deploy
usermod -aG sudo deploy
# copy your SSH key so you can login as deploy:
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
```

From now on you can use `ssh deploy@YOUR_VPS_IP`. The rest of this guide uses whichever user you choose.

### 3.6 Configure firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status   # should show SSH + Nginx allowed
```

---

## 4. PostgreSQL setup

### Option A — Install PostgreSQL on the VPS itself (recommended for simplicity)

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

Create database and user:

```bash
sudo -u postgres psql
```

Inside psql, run these one by one:

```sql
CREATE DATABASE amlakbin;
CREATE USER amlakbin_user WITH ENCRYPTED PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE amlakbin TO amlakbin_user;
ALTER DATABASE amlakbin OWNER TO amlakbin_user;
\q
```

Test the connection:

```bash
psql postgresql://amlakbin_user:CHOOSE_A_STRONG_PASSWORD@localhost:5432/amlakbin
# Should connect. Type \q to exit.
```

Your `DATABASE_URL` is:
```
postgresql://amlakbin_user:CHOOSE_A_STRONG_PASSWORD@localhost:5432/amlakbin
```

### Option B — Use Parspack managed PostgreSQL

If you created a managed PostgreSQL instance on Parspack, they give you a connection string directly. Use that as your `DATABASE_URL`. Skip the psql commands above.

---

## 5. Nginx setup — both domains

### 5.1 Main app domain

Create the config file:

```bash
nano /etc/nginx/sites-available/amlakbin
```

Paste this (replace `amlakbin.ir` with your domain):

```nginx
server {
    listen 80;
    server_name amlakbin.ir www.amlakbin.ir;

    # Max upload size — match the 10MB limit in the upload API route
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

### 5.2 Share page subdomain

```bash
nano /etc/nginx/sites-available/amlakbin-view
```

Paste this (same app, same port — Next.js handles routing):

```nginx
server {
    listen 80;
    server_name view.amlakbin.ir;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

### 5.3 Enable both sites

```bash
ln -s /etc/nginx/sites-available/amlakbin /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/amlakbin-view /etc/nginx/sites-enabled/

# Remove default nginx site
rm /etc/nginx/sites-enabled/default

# Test config is valid
nginx -t

# If it says "syntax is ok" — reload
systemctl reload nginx
```

---

## 6. SSL certificates

> Make sure your DNS A records are pointing to this VPS IP before running this.
> Certbot contacts Let's Encrypt — your VPN must be ON for this step (or run it while you have internet).
> Let's Encrypt is accessible from Iran-hosted servers directly, without VPN.

```bash
certbot --nginx -d amlakbin.ir -d www.amlakbin.ir -d view.amlakbin.ir
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose option **2** (redirect HTTP to HTTPS)

Certbot auto-renews every 90 days via a systemd timer. Verify:

```bash
systemctl status certbot.timer
```

---

## 7. Deploy the app — first time

> **You do not need GitHub access on the VPS.**
> You upload the code directly from your **local machine** to the VPS using `rsync`.
> Run rsync commands from your local machine (with VPN on, or using your local internet).

### 7.1 Create the app directory on VPS

On VPS:

```bash
mkdir -p /var/www/amlakbin
```

### 7.2 Upload code from your local machine

On your **local machine** (run this in the project directory):

```bash
rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude="app/generated/prisma" \
  --exclude=".env*" \
  --exclude="ecosystem.config.js" \
  --exclude="scripts/reports" \
  ./ deploy@YOUR_VPS_IP:/var/www/amlakbin/
```

> This sends all source files except secrets and build artifacts.
> `deploy` is the user you created in step 3.5 — or use `root` if you skipped that.

### 7.3 Install dependencies on VPS

On VPS:

```bash
cd /var/www/amlakbin
npm ci
```

> `npm ci` uses exact versions from `package-lock.json`. Always use this on the server, never `npm install`.

### 7.4 Create environment file

On VPS:

```bash
cd /var/www/amlakbin
nano .env
```

Paste and fill in ALL values:

```
DATABASE_URL=postgresql://amlakbin_user:YOUR_DB_PASSWORD@localhost:5432/amlakbin
NEXTAUTH_SECRET=YOUR_32_CHAR_SECRET
NEXTAUTH_URL=https://amlakbin.ir

AVALAI_API_KEY=YOUR_AVALAI_KEY
NESHAN_API_KEY=YOUR_NESHAN_KEY
NEXT_PUBLIC_NESHAN_MAP_KEY=YOUR_NESHAN_KEY

KAVENEGAR_API_KEY=YOUR_KAVENEGAR_KEY
ZARINPAL_MERCHANT_ID=YOUR_ZARINPAL_UUID

STORAGE_ENDPOINT=https://s3.parspack.com
STORAGE_ACCESS_KEY=YOUR_STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY=YOUR_STORAGE_SECRET_KEY
STORAGE_BUCKET_NAME=YOUR_BUCKET_NAME

NEXT_PUBLIC_SHARE_DOMAIN=https://view.amlakbin.ir

CRON_SECRET=YOUR_CRON_SECRET
NODE_ENV=production
```

Save with Ctrl+X, Y, Enter.

> **Why `.env` and not `.env.local`?**
> This project uses Prisma v7 with `prisma.config.ts`. When you run CLI commands like `npx prisma migrate deploy`,
> Prisma reads the database URL via dotenv which loads `.env` by default.
> Next.js also reads `.env`. Using `.env` means both work without any extra steps.

Protect the file:

```bash
chmod 600 /var/www/amlakbin/.env
```

### 7.5 Build the app

```bash
cd /var/www/amlakbin
npm run build
```

This takes 2–4 minutes. It outputs:
- `.next/standalone/` — self-contained Node.js server
- `.next/static/` — static assets (JS, CSS)
- `public/` — your public files

After build, copy static files into the standalone directory (Next.js requires this):

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

---

## 8. Environment variables (PM2 ecosystem file)

The app is run by PM2 using the standalone server. Create the PM2 ecosystem file to pass env vars to the running process:

```bash
nano /var/www/amlakbin/ecosystem.config.js
```

Paste and fill in ALL values (same values as your `.env` file):

```js
module.exports = {
  apps: [
    {
      name: "amlakbin",
      script: ".next/standalone/server.js",
      cwd: "/var/www/amlakbin",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",

        DATABASE_URL: "postgresql://amlakbin_user:YOUR_DB_PASSWORD@localhost:5432/amlakbin",
        NEXTAUTH_SECRET: "YOUR_32_CHAR_SECRET",
        NEXTAUTH_URL: "https://amlakbin.ir",

        AVALAI_API_KEY: "YOUR_AVALAI_KEY",
        NESHAN_API_KEY: "YOUR_NESHAN_KEY",
        NEXT_PUBLIC_NESHAN_MAP_KEY: "YOUR_NESHAN_KEY",

        KAVENEGAR_API_KEY: "YOUR_KAVENEGAR_KEY",
        ZARINPAL_MERCHANT_ID: "YOUR_ZARINPAL_UUID",

        STORAGE_ENDPOINT: "https://s3.parspack.com",
        STORAGE_ACCESS_KEY: "YOUR_STORAGE_ACCESS_KEY",
        STORAGE_SECRET_KEY: "YOUR_STORAGE_SECRET_KEY",
        STORAGE_BUCKET_NAME: "YOUR_BUCKET_NAME",

        NEXT_PUBLIC_SHARE_DOMAIN: "https://view.amlakbin.ir",

        CRON_SECRET: "YOUR_CRON_SECRET",
      },
    },
  ],
}
```

> **Security:** `ecosystem.config.js` contains secrets. It is already in `.gitignore`.
> Confirm with: `grep ecosystem .gitignore` — if it prints nothing, add it manually:
> ```bash
> echo "ecosystem.config.js" >> /var/www/amlakbin/.gitignore
> ```

Protect the file:

```bash
chmod 600 /var/www/amlakbin/ecosystem.config.js
```

---

## 9. Database migration + seed admin

> Prisma v7 note: DATABASE_URL is read from `.env` by `prisma.config.ts` automatically.
> Make sure your `.env` file is in place (step 7.4) before running these commands.

### 9.1 Generate Prisma client

```bash
cd /var/www/amlakbin
npx prisma generate
```

> This generates `app/generated/prisma/` with the correct native binary for this server's OS/architecture.
> Run this once after first deploy, and again any time you change the schema.

### 9.2 Check pending migrations

```bash
npm run migrate:check
```

### 9.3 Apply all migrations

```bash
npx prisma migrate deploy
```

> `prisma migrate deploy` applies any pending migrations in order. It never rolls back.
> Run this on every deploy if `migrate:check` reports pending migrations.

### 9.4 Validate environment variables

```bash
npm run env:validate
```

All checks must pass. If any fail, fix the value in `.env` and `ecosystem.config.js` and re-run.

### 9.5 Seed the super admin (first deploy only)

```bash
ADMIN_USERNAME=your_admin_username ADMIN_PASSWORD=your_strong_password npm run seed:admin
```

> Pick a strong password. This creates the SUPER_ADMIN user you log into the admin panel with.
> You only run this once. Running it again on an existing user will error — that's fine.

---

## 10. Start the app with PM2

### 10.1 Start

```bash
cd /var/www/amlakbin
pm2 start ecosystem.config.js
```

### 10.2 Verify it started

```bash
pm2 status
# Should show "amlakbin" with status "online"

pm2 logs amlakbin --lines 50
# Should show "started server on 127.0.0.1:3000"
# Look for any ERROR lines — if none, you're good
```

### 10.3 Make PM2 survive reboots

```bash
pm2 startup
# This prints a command. Copy and run it. It looks like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

pm2 save
# Saves the current process list so PM2 restores it on reboot
```

### 10.4 Test the app

```bash
# Test directly on the server (bypasses Nginx):
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
# Should print 200 or 307 (redirect to /login)
```

Open in browser: `https://amlakbin.ir` — you should see the login page.

---

## 11. Cron job

The cron job locks expired trials and sends renewal reminder notifications. It must be called from localhost (security guard in the code rejects external calls).

```bash
crontab -e
```

Add this line at the bottom:

```
*/5 * * * * curl -s -X POST -H "x-cron-secret: YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/lock-expired-trials >> /var/log/amlakbin-cron.log 2>&1
* * * * * curl -s -X POST -H "x-cron-secret: YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/fire-calendar-reminders >> /var/log/amlakbin-cron.log 2>&1
```

> The second line fires due calendar reminders (per-minute). Same `CRON_SECRET` as the first line.

> Replace `YOUR_CRON_SECRET` with the same value you set in `ecosystem.config.js` and `.env`.
> This runs every 5 minutes. The log goes to `/var/log/amlakbin-cron.log`.

Verify cron is working after 5 minutes:

```bash
cat /var/log/amlakbin-cron.log
# Should show JSON like {"statusSynced":0,"notificationsSent":0}
```

---

## 12. Verify everything is working

Run the health check (checks all 6 external services):

```bash
cd /var/www/amlakbin
npm run health
```

All 6 should be green: DB, Storage, AvalAI, KaveNegar, Neshan, Zarinpal.

**Manual smoke test checklist:**

- [ ] `https://amlakbin.ir` loads the login page
- [ ] `https://view.amlakbin.ir` responds (shows 404 for no token, that's correct)
- [ ] Login with the admin credentials you seeded
- [ ] Admin panel at `https://amlakbin.ir/admin/dashboard` loads
- [ ] Register a new office (tests DB write + KaveNegar + Zarinpal trial creation)
- [ ] Create a file with a location pin (tests Neshan map)
- [ ] Upload a photo (tests Sharp + IranServer/Parspack storage)
- [ ] Generate AI description (tests AvalAI)
- [ ] Send an SMS share (tests KaveNegar)
- [ ] Visit the share link at `https://view.amlakbin.ir/[token]`

---

## 13. Every subsequent deploy

Each time you make code changes locally and want to deploy:

### Step 1 — On your local machine (VPN on or local internet):

```bash
# From your local project directory:
rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude="app/generated/prisma" \
  --exclude=".env*" \
  --exclude="ecosystem.config.js" \
  --exclude="scripts/reports" \
  ./ deploy@YOUR_VPS_IP:/var/www/amlakbin/
```

### Step 2 — On VPS (SSH in):

```bash
cd /var/www/amlakbin

# Install any new dependencies
npm ci

# Check for pending migrations
npm run migrate:check

# Apply migrations if any were reported
npx prisma migrate deploy

# Regenerate Prisma client (safe to always run — only needed if schema changed)
npx prisma generate

# Build
npm run build

# Copy static files into standalone output
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Restart the app (zero-downtime reload)
pm2 reload amlakbin

# Verify
pm2 status
pm2 logs amlakbin --lines 20
```

> Steps 4 and 5 (migrate deploy + generate) are safe to always run — they are idempotent.

---

## 14. Editing code after deployment

> Since GitHub may be inaccessible from Iran without VPN, all code editing and deploying
> is done on your **local machine**, then pushed to VPS via rsync. You never need GitHub on the VPS.

### Normal workflow:

1. **Edit code locally** — make your changes, test with `npm run dev`
2. **Run tests locally** — `npm test` — make sure all tests pass
3. **rsync to VPS** — use the rsync command from Section 13 Step 1
4. **Build and restart on VPS** — follow Section 13 Step 2

### If you want to edit a file quickly on the VPS directly (emergency fix):

```bash
ssh deploy@YOUR_VPS_IP
cd /var/www/amlakbin

# Edit the file with nano:
nano app/api/some-route/route.ts

# Rebuild and restart:
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 reload amlakbin
```

> **Warning:** If you edit files directly on VPS, remember to copy those changes back to your
> local machine too, or they will be overwritten the next time you rsync. Always keep local as source of truth.

### If you set up a local Git server (optional):

If you want proper git history without GitHub, you can run a bare git repo on the VPS:

```bash
# On VPS — create a bare repo to receive pushes:
mkdir -p /home/deploy/repos/amlakbin.git
cd /home/deploy/repos/amlakbin.git
git init --bare
```

```bash
# On your LOCAL machine — add VPS as a remote:
git remote add vps deploy@YOUR_VPS_IP:/home/deploy/repos/amlakbin.git
git push vps main
```

```bash
# On VPS — after git push, pull into the app directory:
cd /var/www/amlakbin
git pull /home/deploy/repos/amlakbin.git main
```

This is optional. rsync is simpler for solo development.

---

## 15. Troubleshooting

### App won't start — "Cannot find module" error

The Prisma native binary is missing from the standalone output. Fix:

```bash
cd /var/www/amlakbin
npx prisma generate
cp -r app/generated/prisma .next/standalone/app/generated/prisma
pm2 restart amlakbin
```

### App starts but database connection fails

```bash
# Test the connection string directly:
psql "YOUR_DATABASE_URL"
# If it fails, the password, host, or port is wrong in .env / ecosystem.config.js
```

### `npx prisma migrate deploy` says "no DATABASE_URL"

The `.env` file is missing or malformed. Check:

```bash
cat /var/www/amlakbin/.env | grep DATABASE_URL
# If empty, re-create the .env file (step 7.4)
```

### Nginx returns 502 Bad Gateway

The app is not running on port 3000.

```bash
pm2 status          # check if amlakbin is "online"
pm2 logs amlakbin   # look for crash reason
```

If the app crashed, restart it and check logs:

```bash
pm2 restart amlakbin
pm2 logs amlakbin --lines 100
```

### Certbot / SSL fails

DNS not propagated yet. Check:

```bash
dig amlakbin.ir +short      # should return your VPS IP
dig view.amlakbin.ir +short  # same
```

If wrong IP or empty, fix the DNS A record in your domain registrar panel and wait.

### `npm run build` fails with TypeScript errors

```bash
# Check exact error
npm run build 2>&1 | head -50
```

Fix the error in the code locally, rsync to VPS, and rebuild.

### After reboot, app is not running

```bash
pm2 resurrect    # restores saved process list
# If that doesn't work:
pm2 start ecosystem.config.js
pm2 save
```

If PM2 startup was never configured:

```bash
pm2 startup
# Run the command it prints
pm2 save
```

### Check Nginx error logs

```bash
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log
```

### Check app logs

```bash
pm2 logs amlakbin --lines 100
# Or the raw log files:
ls ~/.pm2/logs/
cat ~/.pm2/logs/amlakbin-error.log
```

### `.next/` cache corruption (dev issue, can happen on VPS too)

```bash
rm -rf .next
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart amlakbin
```

---

## Quick reference — commands you'll use most

```bash
pm2 status                          # is the app running?
pm2 logs amlakbin --lines 50        # recent logs
pm2 reload amlakbin                 # restart with zero downtime
pm2 restart amlakbin                # hard restart

nginx -t                            # test nginx config
systemctl reload nginx              # apply nginx config changes

sudo -u postgres psql amlakbin      # open DB shell
npx prisma studio                   # GUI for DB (runs on port 5555)

npm run health                      # check all 6 external services
npm run env:validate                # check all env vars are set
npm run migrate:check               # check for unapplied migrations
npx prisma migrate deploy           # apply pending migrations
npx prisma generate                 # regenerate Prisma client after schema change
```

### rsync from local machine (run from your local project folder):

```bash
rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude="app/generated/prisma" \
  --exclude=".env*" \
  --exclude="ecosystem.config.js" \
  --exclude="scripts/reports" \
  ./ deploy@YOUR_VPS_IP:/var/www/amlakbin/
```
