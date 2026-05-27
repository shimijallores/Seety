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
git clone https://<YOUR_GITHUB_USERNAME>:<YOUR_GITHUB_TOKEN>@github.com/<YOUR_GITHUB_USERNAME>/seety.git .
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

## 6. Test the Server (Manual)

```bash
cd /opt/seety/server
node dist/index.js
```

Open a second terminal SSH session and test:

```bash
curl http://localhost:3000/api/health
```

Expected response: `{"status":"ok"}`

Also test that it serves the client:

```bash
curl http://localhost:3000/ | head -5
```

Should return HTML (the built React app). Press `Ctrl+C` to stop the server.

## 7. Install & Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server with PM2
pm2 start /opt/seety/server/dist/index.js --name seety

# Save the process list (so it restarts on reboot)
pm2 save

# Generate startup script (follow the instructions it prints)
sudo pm2 startup systemd
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

    # Increase max body size for any future uploads
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
   - Type: `A`
   - Host: `@`
   - Value: `<YOUR_DROPLET_IP>`
   - TTL: `Automatic` (or `300`)
4. Add a **CNAME Record** for www:
   - Type: `CNAME`
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
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically modify the nginx config and set up auto-renewal.

## 11. Verify Everything

```bash
# Check PM2 process
pm2 status

# Check nginx
sudo systemctl status nginx

# Check certbot auto-renewal
sudo certbot renew --dry-run
```

Open `https://procurex.site` in your browser. The app should load with full API functionality.

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

| Symptom | Check |
|---|---|
| `502 Bad Gateway` | PM2 not running → `pm2 restart seety` |
| `Cannot GET /` | Nginx proxy_pass wrong → verify nginx config |
| API returns HTML | Server not serving /api routes → check Nginx location order |
| `ECONNREFUSED` on DB | Ensure `/opt/seety/server/` is writable (SQLite creates .db file there) |
| Blank page in browser | Open DevTools → check if JS/CSS files 404 → rebuild client |

## File Ownership (if you used a non-root user)

If you created a user like `deploy` instead of running as root:

```bash
sudo chown -R deploy:deploy /opt/seety
```

And in PM2 startup, run commands as that user.
