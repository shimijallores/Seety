# Seety — Production Deployment Guide

Domain: `procurex.site`  
Server: Ubuntu 22.04+ DigitalOcean Droplet  
Stack: Node 22+, Express, SQLite, Nginx, PM2

---

## 1. Connect to Your Droplet

```bash
ssh root@<YOUR_DROPLET_IP>
```

## 2. System Update & Install Dependencies

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx, git, certbot
sudo apt install -y nginx git certbot python3-certbot-nginx

# Verify Node
node -v    # Expect v22.x.x
npm -v     # Expect 10.x.x
```

## 3. Clone the Repository

```bash
# Create app directory
mkdir -p /opt/seety
cd /opt/seety

# Clone (use a GitHub personal access token since it's private)
# Generate a token at: Settings > Developer settings > Personal access tokens > Fine-grained tokens
# Give it "Contents: read" access to the repo

# IMPORTANT: the trailing dot "." clones directly into /opt/seety, NOT a subfolder
git clone https://<YOUR_GITHUB_USERNAME>:<YOUR_GITHUB_TOKEN>@github.com/<YOUR_GITHUB_USERNAME>/seety.git .

# Verify the structure — you should see client/ and server/ directories directly:
ls
# Expected output:  client  DEPLOY.md  package.json  README.md  server
```

If you already cloned without the `.` and have a nested `Seety/Seety/` structure, fix it:

```bash
# If /opt/seety/Seety exists, move everything up one level
cd /opt/seety
mv Seety/* Seety/.* . 2>/dev/null; rmdir Seety
```

## 4. Create Production Environment File

```bash
cd /opt/seety/server

cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
CLIENT_URL=https://procurex.site
EOF
```

## 5. Install Dependencies & Build

```bash
cd /opt/seety

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client

# Build the client (React → static files)
npm run build --prefix client

# Build the server (TypeScript → JavaScript)
npm run build --prefix server
```

Expected output from server build: compiled `.js` files appear in `server/dist/`.

## 6. Test the Server (Manual)

```bash
cd /opt/seety/server
node dist/index.js
```

Open a **second** terminal SSH session and test:

```bash
# Health check
curl http://localhost:3000/api/health

# Client HTML
curl http://localhost:3000/ | head -5
```

- Health check should return: `{"status":"ok"}`
- Client should return HTML (the built React app, `<div id="root">` etc.)

Press `Ctrl+C` to stop the manual test.

## 7. Install & Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server with PM2
cd /opt/seety/server
pm2 start dist/index.js --name seety

# Save the process list (so it restarts on reboot)
pm2 save

# Generate startup script (follow the instructions it prints)
sudo pm2 startup systemd
```

Verify PM2 is running:

```bash
pm2 status
# Should show "seety" as online
```

## 8. Configure Nginx

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/seety
```

Paste the following:

```nginx
server {
    listen 80;
    server_name procurex.site www.procurex.site;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/seety /etc/nginx/sites-enabled/
sudo nginx -t                    # test config
sudo systemctl restart nginx
```

## 9. Point Your Domain DNS

In your **Namecheap** dashboard:

1. Go to **Domain List** → `procurex.site` → **Advanced DNS**
2. Delete any existing `A` records for `@`
3. Add a new **A Record**:
   - Type: `A Record`
   - Host: `@`
   - Value: `<YOUR_DROPLET_IP>`
   - TTL: `Automatic` (or `300`)
4. Add a **CNAME Record** for www:
   - Type: `CNAME Record`
   - Host: `www`
   - Value: `procurex.site`
   - TTL: `Automatic`

Wait 5–15 minutes for DNS propagation.

## 10. Get HTTPS (SSL Certificate)

Run Certbot to auto-configure HTTPS:

```bash
sudo certbot --nginx -d procurex.site -d www.procurex.site
```

Follow the prompts:
- Enter your email (for renewal notices)
- Agree to the terms
- Choose whether to redirect HTTP to HTTPS → **2** (Yes, redirect)

Certbot automatically modifies the nginx config and sets up auto-renewal.

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

## 11. Verify Everything

```bash
# Check PM2 process
pm2 status

# Check nginx
sudo systemctl status nginx

# Check the app responds through nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost
# Should return 200 (or 301/302 if redirected to HTTPS)
```

Open `https://procurex.site` in your browser. The app should load with the map, all pins, and working API.

## 12. Subsequent Deploys (After Pushing Changes)

```bash
cd /opt/seety
git pull
npm install --prefix server
npm install --prefix client
npm run build --prefix client
npm run build --prefix server
pm2 restart seety
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ENOENT: schema.sql` | Build missing or path wrong | Run `npm run build --prefix server`, verify `server/dist/` exists |
| `502 Bad Gateway` | PM2 not running | `pm2 restart seety` |
| `Cannot GET /` | Nginx proxy_pass wrong | Verify `proxy_pass http://127.0.0.1:3000;` in nginx config |
| API returns HTML instead of JSON | Nginx not routing `/api/` correctly | Ensure `location /api/` block comes **before** `location /` |
| Blank page, JS/CSS 404 | Client not built or path wrong | Rebuild: `npm run build --prefix client` |
| `ECONNREFUSED` on DB | Server can't write `.db` file | Ensure `/opt/seety/server/` directory is writable |
| Port already in use | Another process on 3000 | `kill $(lsof -t -i:3000)` then `pm2 restart seety` |

## File Ownership (if you used a non-root user)

If you created a user like `deploy` instead of running as root:

```bash
sudo chown -R deploy:deploy /opt/seety
```

And in PM2 startup, run commands as that user:

```bash
pm2 startup systemd -u deploy --hp /home/deploy
```
