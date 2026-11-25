# NeroAI Production Deployment Guide (Oracle Linux 9)

- **Deployment Type:** Git-based Native (Bare-Metal) VPS Deployment (`Nginx` + `systemd` + `uv`, no Docker)
- **Server OS:** Oracle Linux 9 (Always Free, 1 CPU)
- **Public IP:** `130.210.124.229`
- **Domain:** `nerotechnology.online` / `www.nerotechnology.online`
- **Database:** External Neon PostgreSQL (`neondb`)
- **Backend Port:** `8080` (internal, proxied by Nginx on ports `80`/`443`)

---

## Prerequisites Checklist

1. **OCI Security List (Ingress Rules):**
   - `0.0.0.0/0` | TCP | Source Port Range: **`All`** | Destination Port Range: **`80`**
   - `0.0.0.0/0` | TCP | Source Port Range: **`All`** | Destination Port Range: **`443`**
2. **Domain DNS Records:**
   - `A` record for `@` (`nerotechnology.online`) → `130.210.124.229`
   - `A` record for `www` (`www.nerotechnology.online`) → `130.210.124.229`

---

## Connect to Server (From Windows PowerShell)

```powershell
ssh -i "C:\Users\denis\Downloads\ssh-key-2026-11-24 (1).key" opc@130.210.124.229
```

Once your prompt changes to `[opc@neroai-staging-vnic ~]$`, run Steps 1–7 below in order.

---

## Step 1: Add 2 GB Swap, Open OS Firewall (`firewalld`) & Configure SELinux

Adding 2 GB swap prevents the 1 GB RAM Free Tier VM from freezing during `npm run build`.

```bash
# Add 2 GB swap
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Open HTTP & HTTPS in Oracle Linux firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Allow Nginx to proxy to local port 8080 under SELinux
sudo setsebool -P httpd_can_network_connect 1
```

---

## Step 2: Install Packages (`git`, `nginx`, `certbot`, `redis`, `nodejs 20`, `uv`)

```bash
sudo dnf install -y oracle-epel-release-el9
sudo dnf install -y git nginx certbot python3-certbot-nginx redis
sudo dnf module enable -y nodejs:20
sudo dnf install -y nodejs

# Install uv (Python package & virtualenv manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# Start and enable Redis
sudo systemctl enable --now redis
```

---

## Step 3: Clone `main` Branch to `/var/www/codebot`

```bash
sudo mkdir -p /var/www
sudo chown -R opc:opc /var/www
cd /var/www
git clone -b main https://github.com/rajnagani31/nero.git codebot
cd /var/www/codebot
```

*(If the repository is private and Git asks for a password, paste a GitHub Personal Access Token instead of your GitHub password.)*

---

## Step 4: Configure `.env` & GitHub App Private Key

```bash
cd /var/www/codebot
cp .env.example .env
nano .env
```

Update the following production values in `.env`:

```dotenv
# Neon PostgreSQL (replace YOUR_NEON_PASSWORD with your actual Neon password)
DATABASE_URL=postgresql+psycopg2://neondb_owner:YOUR_NEON_PASSWORD@ep-twilight-sound-bifm3bp4-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Redis & Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# URLs & Ports
FRONTEND_BASE_URL=https://nerotechnology.online
BACKEND_PORT=8080

# Auth & Cookies
JWT_SECRET=CHANGE-THIS-TO-A-LONG-RANDOM-SECRET
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax

# LLM Keys
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key

# GitHub App
GITHUB_APP_ID=your_github_app_id
GITHUB_PRIVATE_KEY_PATH=keys/github-app.pem
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# Schema (use Alembic migrations, not auto-create)
AUTO_CREATE_SCHEMA=false
AUTO_MIGRATE_LEGACY_AUTH_SCHEMA=true
```

Save & exit `nano` (`Ctrl+O`, `Enter`, `Ctrl+X`).

Next, save your GitHub App private key (`.pem`):

```bash
mkdir -p /var/www/codebot/keys
nano /var/www/codebot/keys/github-app.pem
```

Paste your `.pem` file contents, save & exit, then secure permissions:

```bash
chmod 600 /var/www/codebot/keys/github-app.pem
```

---

## Step 5: Install Python Dependencies, Migrate Neon DB & Build Frontend

```bash
cd /var/www/codebot
uv sync --no-dev
uv run alembic upgrade head

cd /var/www/codebot/apps/frontend
npm install
npm run build

# Grant SELinux read permission for Nginx on built static assets
sudo chcon -Rt httpd_sys_content_t /var/www/codebot/apps/frontend/dist
```

---

## Step 6: Configure Let's Encrypt SSL & Nginx

Make sure your domain DNS already resolves to `130.210.124.229` before running `certbot`.

```bash
# 1. Create a temporary port-80 block so Certbot can verify the domain
sudo tee /etc/nginx/conf.d/nerotechnology.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name nerotechnology.online www.nerotechnology.online;
    root /var/www/codebot/apps/frontend/dist;
}
EOF

sudo systemctl enable --now nginx

# 2. Obtain SSL certificate
sudo certbot certonly --nginx -d nerotechnology.online -d www.nerotechnology.online

# 3. Apply full production Nginx config (HTTPS + SPA + /api/ proxy to 8080)
sudo cp /var/www/codebot/deploy/nginx/production.conf /etc/nginx/conf.d/nerotechnology.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 7: Enable & Start Backend (Port 8080) and Celery Services

```bash
sudo cp /var/www/codebot/deploy/systemd/neroai-backend.service /etc/systemd/system/
sudo cp /var/www/codebot/deploy/systemd/neroai-celery.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now neroai-backend neroai-celery

# Verify both services are active (running)
sudo systemctl status neroai-backend neroai-celery --no-pager
```

---

## Step 8: Configure Production GitHub App

In GitHub (**Settings → Developer settings → GitHub Apps → Your App**):

- **Webhook URL:** `https://nerotechnology.online/api/github/webhook`
- **Webhook secret:** Must match `GITHUB_WEBHOOK_SECRET` in `/var/www/codebot/.env`
- **Callback URL:** `https://nerotechnology.online/github/callback`

---

## Step 9: Verify Deployment

```bash
curl -i https://nerotechnology.online/api/health
curl -I https://nerotechnology.online/
```

To inspect live logs if needed:

```bash
sudo journalctl -u neroai-backend -f
sudo journalctl -u neroai-celery -f
```

---

## Future Redeploys & Rollback

### Deploy latest changes from `main`:

```bash
cd /var/www/codebot
git pull origin main
uv sync --no-dev
uv run alembic upgrade head
cd apps/frontend && npm install && npm run build
sudo chcon -Rt httpd_sys_content_t /var/www/codebot/apps/frontend/dist
sudo systemctl restart neroai-backend neroai-celery
```

### Rollback to previous commit:

```bash
cd /var/www/codebot
git checkout <previous_commit_sha>
cd apps/frontend && npm run build
sudo chcon -Rt httpd_sys_content_t /var/www/codebot/apps/frontend/dist
sudo systemctl restart neroai-backend neroai-celery
```
