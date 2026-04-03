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
7. [Deploy the app — first time](#7-deploy-the-app--first-time)
8. [Environment variables](#8-environment-variables)
9. [Database migration + seed admin](#9-database-migration--seed-admin)
10. [Start the app with PM2](#10-start-the-app-with-pm2)
11. [Cron job](#11-cron-job)
12. [Verify everything is working](#12-verify-everything-is-working)
13. [Every subsequent deploy](#13-every-subsequent-deploy)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Code changes already done

These were fixed in the codebase before you deploy — no action needed:

| File | Change | Why |
|------|--------|-----|
| `next.config.ts` | Added `output: "standalone"` | Required to build a self-contained server for VPS |
| `next.config.ts` | Added `outputFileTracingIncludes` for Prisma | Ensures the Prisma native query engine binary is included in the standalone build |
| `.env.example` | Removed `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seed-only credentials — env validator was incorrectly requiring them at runtime |

---

## 2. What to prepare before you start

Have all of these ready **before** touching the VPS. You will need them offline.

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

### VPS spec to order:
- **OS:** Ubuntu 24.04 LTS
- **CPU:** 4 vCPU
- **RAM:** 8 GB
- **Storage:** 80 GB NVMe SSD
- **Bandwidth:** 200 Mbps or higher

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

### 3.2 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # should print v20.x.x
npm --version    # should print 10.x.x
```

### 3.3 Install system tools

```bash
apt install -y git nginx certbot python3-certbot-nginx ufw
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

### 7.1 Clone the repository on VPS

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_GIT_REPO_URL amlakbin
cd /var/www/amlakbin
```

If your repo is private (which it should be), either:
- Set up an SSH deploy key: `ssh-keygen -t ed25519 -C "vps-deploy"` → add public key to GitHub/GitLab as deploy key
- Or use HTTPS with a personal access token

### 7.2 Install dependencies

```bash
cd /var/www/amlakbin
npm ci
```

> `npm ci` is like `npm install` but faster and stricter — uses exact versions from `package-lock.json`. Always use this on the server.

### 7.3 Set environment variables before build

The build process needs some env vars (especially `NEXT_PUBLIC_*` vars are baked in at build time):

```bash
cp .env.example .env.local
nano .env.local
```

Fill in ALL values. Save with Ctrl+X, Y, Enter.

### 7.4 Build the app

```bash
npm run build
```

This takes 2–4 minutes. It outputs:
- `.next/standalone/` — self-contained Node.js server
- `.next/static/` — static assets (JS, CSS)
- `public/` — your public files

After build, you must manually copy static files into the standalone directory (Next.js requires this):

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

---

## 8. Environment variables

The app is run by PM2 using the standalone server. The cleanest way to handle env vars is via a PM2 ecosystem file.

Create it:

```bash
nano /var/www/amlakbin/ecosystem.config.js
```

Paste and fill in ALL values:

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

> **Security:** `ecosystem.config.js` contains secrets. Make sure it is not in your git repo.
> Confirm it is in `.gitignore`:
> ```bash
> echo "ecosystem.config.js" >> .gitignore
> ```

---

## 9. Database migration + seed admin

### 9.1 Run migrations

```bash
cd /var/www/amlakbin

# Check what migrations are pending
npm run migrate:check

# Apply all pending migrations
npx prisma migrate deploy
```

> `prisma migrate deploy` applies any pending migrations in order. It never rolls back.
> Run this on every deploy if `migrate:check` reports pending migrations.

### 9.2 Generate Prisma client

```bash
npx prisma generate
```

> This regenerates `app/generated/prisma/` with the correct binaries for this server's OS/architecture.
> Run this once after first deploy, and again any time you change the schema.

### 9.3 Validate environment variables

```bash
npm run env:validate
```

All checks must pass. If any fail, fix the value in `ecosystem.config.js` and re-run.

### 9.4 Seed the super admin (first deploy only)

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
```

> Replace `YOUR_CRON_SECRET` with the same value you set in `ecosystem.config.js`.
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

Each time you push changes and want to deploy:

```bash
cd /var/www/amlakbin

# 1. Pull latest code
git pull

# 2. Install any new dependencies
npm ci

# 3. Check for pending migrations
npm run migrate:check

# 4. Apply migrations if any were reported
npx prisma migrate deploy

# 5. Regenerate Prisma client (only needed if schema changed — safe to always run)
npx prisma generate

# 6. Build
npm run build

# 7. Copy static files into standalone output
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 8. Restart the app (zero-downtime reload)
pm2 reload amlakbin

# 9. Verify
pm2 status
pm2 logs amlakbin --lines 20
```

> Steps 4 and 5 are safe to always run — they're idempotent. Skip step 4 only if you're certain no schema changes were made.

---

## 14. Troubleshooting

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
# If it fails, the password, host, or port is wrong in ecosystem.config.js
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

Fix the error in the code, commit, push, then `git pull` on VPS and rebuild.

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
```
