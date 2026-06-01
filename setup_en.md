# PDF Split & Merge Deployment & Usage Guide (Ubuntu 22.04.4 LTS)

This guide walks you through deploying the project on a server via Docker and also covers local run, direct Nginx deployment, and offline/intranet scenarios. The project is a pure frontend static site. All PDF operations are performed in the user's browser memory; no files are uploaded to the server.

## 1. Project Overview & Directory Structure

- Site files (the trio)
  - index.html (entry page)
  - styles.css (styles)
  - app.js (logic)
- Features
  - Split PDF: supports page ranges, reverse ranges, and repeated extraction (example: `1,1,3-5,7-2`).
  - Merge PDFs: select multiple PDFs, reorder via drag-and-drop or buttons, then merge.
  - Custom output filename with automatic `.pdf` completion.
  - Dark theme and mobile optimization.
- Privacy & Security: no PDF is uploaded; processing is entirely local in the browser.

## 2. Quick Start (Local)

- Option A: Double-click index.html to open directly (simplest for quick local viewing).
- Option B: Python simple static server (recommended)

```bash
cd /path/to/site
python3 -m http.server 5500
# Open http://localhost:5500/ in your browser
```

- Option C: Node http-server (if you have Node installed)

```bash
npm i -g http-server
http-server -p 5500
```

## 3. Docker Deployment (Ubuntu 22.04.4 LTS)

### 1) Upload site files to the server

From your local machine, upload the trio to your server, for example:

```bash
scp index.html styles.css app.js user@your_server_ip:/opt/pdf-split-merge/site/
```

Ensure the server has `/opt/pdf-split-merge/site/` and it contains the three files above.

### 2) Install Docker (official repository)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release; echo $VERSION_CODENAME) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo docker version
```

Optional: add the current user to the `docker` group (avoid sudo each time):

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 3) Build an Nginx static image with Dockerfile

Create Dockerfile on the server (`/opt/pdf-split-merge/Dockerfile`):

```Dockerfile
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
```

Build the image and run the container (bind to port 80):

```bash
cd /opt/pdf-split-merge
sudo docker build -t pdf-split-merge:latest .

sudo docker run -d \
  --name pdf-split-merge \
  -p 80:80 \
  --restart unless-stopped \
  pdf-split-merge:latest
```

Verify the service:

```bash
curl -I http://localhost/
# Or visit http://your_server_ip/ in the browser
```

Check container logs (for troubleshooting):

```bash
sudo docker logs -f pdf-split-merge
```

### 4) Docker Compose (recommended; includes frontend and feedback API)

Create directory structure and `docker-compose.yml` in `/opt/pdf-split-merge`:

- Directory structure
  - /opt/pdf-split-merge/site (place frontend trio: index.html, styles.css, app.js)
  - /opt/pdf-split-merge/api (place backend script: server.py)

```yaml
services:
  web:
    image: nginx:alpine
    container_name: pdf-web
    volumes:
      - ./site:/usr/share/nginx/html:ro
    ports:
      - "8080:80"
    restart: unless-stopped

  api:
    image: python:3.11-alpine
    container_name: pdf-api
    working_dir: /app
    volumes:
      - ./api:/app
    command: python server.py
    ports:
      - "5600:5600"
    restart: unless-stopped
```

Start and manage:

```bash
cd /opt/pdf-split-merge
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f

# Restart frontend after updating site files
sudo docker compose restart web
# Restart backend after updating scripts
sudo docker compose restart api
```

Note: By default the frontend listens on 8080 (container 80), and the API on 5600. If host port 80 is free and you want the frontend to serve on 80 directly, change `ports: "8080:80"` to `"80:80"`.

### 5) Open firewall and cloud security groups

If UFW is enabled, allow 80/443:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

Also open inbound 80/443 in your cloud provider's security group settings.

## 4. Domain & HTTPS (recommended)

Use Nginx on the host for reverse proxy and certificate management; containers only serve static content:

1. Point your domain's DNS to the server's public IP.
2. Install Nginx and Certbot:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

3. Configure reverse proxy (example: `/etc/nginx/sites-available/pdf-tools`), force HTTP to HTTPS, and proxy separately to frontend and backend:

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "no-referrer" always;
  add_header Content-Security-Policy "upgrade-insecure-requests" always;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5600;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

4. Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/pdf-tools /etc/nginx/sites-enabled/pdf-tools
sudo nginx -t && sudo systemctl reload nginx
```

5. Issue HTTPS certificates:

```bash
sudo certbot --nginx -d yourdomain.com
```

(Alternatives: Caddy with automatic certificates, or containerized Nginx; choose based on your preference.)

## 5. Direct Nginx Deployment (without Docker)

1. Place site files in `/var/www/pdf-split-merge`.
2. Create a site config (`/etc/nginx/sites-available/pdf-split-merge`):

```nginx
server {
  listen 80;
  server_name yourdomain.com;

  root /var/www/pdf-split-merge;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

3. Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/pdf-split-merge /etc/nginx/sites-enabled/pdf-split-merge
sudo nginx -t && sudo systemctl reload nginx
```

4. Configure HTTPS: use `certbot --nginx` as above.

## 6. Offline/Intranet Environment (localizing pdf-lib)

By default, the project references `pdf-lib` via CDN. If your server cannot access the internet, localize the dependency:

1. Download the browser build `pdf-lib.min.js` to your site directory (e.g., `/opt/pdf-split-merge/site/vendor/pdf-lib.min.js`).
2. Modify the script import in `index.html` to reference the local file:

```html
<!-- Replace the original CDN reference with a local file -->
<script src="vendor/pdf-lib.min.js"></script>
```

After this change, the application no longer relies on external networks.

## 7. Configuration & Customization

- SEO title and branding text: edit `<title>` and header branding in `index.html`.
- Default output file name: custom output names are supported (inputs provided in both Split and Merge cards).
- Theme switching: the `Toggle Theme` button switches between light and dark (remembers user preference).

## 8. FAQ

- Browser support: Chrome, Edge, Firefox, Safari, and modern mobile browsers. Relies on File API, Blob, URL.createObjectURL, drag events, localStorage, and `crypto.randomUUID`.
- Privacy & security: no PDFs are uploaded; processing happens in browser memory.
- Large file performance: memory usage depends on file sizes and counts; keep usage reasonable.
- Port usage: Compose defaults to `8080:80` for frontend and `5600:5600` for API; for public 80/443, consider host Nginx reverse proxy.
- Blank screen or script errors: ensure the trio is present in the site directory; in intranet scenarios, ensure `pdf-lib` is localized and referenced correctly.

## 9. Updates & Rollback

- Image-based: replace files under `site/` → rebuild image → restart container; keep old tags for rollback.
- Compose-based: replace files under `site/` → `docker compose restart`; use version control or backup directories for rollback.

## 10. Command Cheatsheet (copy-paste ready)

```bash
# 1) Install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release; echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2) Use Compose (frontend + backend)
sudo mkdir -p /opt/pdf-split-merge/site
sudo mkdir -p /opt/pdf-split-merge/api
# Upload frontend trio to /opt/pdf-split-merge/site
# Upload server.py to /opt/pdf-split-merge/api

cd /opt/pdf-split-merge
cat > docker-compose.yml <<'EOF'
services:
  web:
    image: nginx:alpine
    container_name: pdf-web
    volumes:
      - ./site:/usr/share/nginx/html:ro
    ports:
      - "8080:80"
    restart: unless-stopped

  api:
    image: python:3.11-alpine
    container_name: pdf-api
    working_dir: /app
    volumes:
      - ./api:/app
    command: python server.py
    ports:
      - "5600:5600"
    restart: unless-stopped
EOF

sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f
```

— End —

