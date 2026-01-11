# PDF Split & Merge 部署与使用指南（Ubuntu 22.04.4 LTS）

本指南手把手教你在服务器上通过 Docker 部署本项目，并包含本地运行、Nginx 直接部署、离线/内网环境处理等说明。项目为纯前端静态站点，所有 PDF 操作在用户浏览器内存完成，不上传文件到服务器。

## 一、项目概览与目录结构

- 站点文件（三件套）
  - index.html（入口页面）
  - styles.css（样式）
  - app.js（逻辑）
- 功能说明
  - Split PDF：支持页码范围、反向与重复提取（示例：`1,1,3-5,7-2`）。
  - Merge PDFs：选择多个 PDF，支持拖拽与移动按钮排序后合并。
  - 自定义输出文件名，自动补全 `.pdf`。
  - 支持暗色主题与移动端优化。
- 隐私与安全：不上传任何 PDF 到服务器，处理全部在浏览器本地进行。

## 二、本地快速运行

- 方式 A：双击 index.html 直接打开（最简，适合本地快速查看）。
- 方式 B：Python 简易静态服务（推荐）

```bash
cd /path/to/site
python3 -m http.server 5500
# 打开浏览器访问 http://localhost:5500/
```

- 方式 C：Node http-server（如有 Node 环境）

```bash
npm i -g http-server
http-server -p 5500
```

## 三、Docker 部署（Ubuntu 22.04.4 LTS）

### 1. 上传站点文件到服务器

在你的本地机器将三件套上传到服务器，例如：

```bash
scp index.html styles.css app.js user@your_server_ip:/opt/pdf-split-merge/site/
```

确保服务器上存在：`/opt/pdf-split-merge/site/`，且里面是上述三文件。

### 2. 安装 Docker（官方源）

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

可选：将当前用户加入 `docker` 组（避免每次 `sudo`）：

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 3. 使用 Dockerfile 构建 Nginx 静态镜像

在服务器上创建 Dockerfile（路径：`/opt/pdf-split-merge/Dockerfile`）：

```Dockerfile
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
```

构建镜像并运行容器（绑定到 80 端口）：

```bash
cd /opt/pdf-split-merge
sudo docker build -t pdf-split-merge:latest .

sudo docker run -d \
  --name pdf-split-merge \
  -p 80:80 \
  --restart unless-stopped \
  pdf-split-merge:latest
```

验证服务：

```bash
curl -I http://localhost/
# 或在浏览器访问 http://your_server_ip/
```

查看容器日志（排错）：

```bash
sudo docker logs -f pdf-split-merge
```

### 4. 使用 Docker Compose（推荐，包含前端与留言板后端）

在 `/opt/pdf-split-merge` 新建目录结构并创建 `docker-compose.yml`：

- 目录结构
  - /opt/pdf-split-merge/site（放置前端三件套：index.html、styles.css、app.js）
  - /opt/pdf-split-merge/api（放置后端脚本：server.py）

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

启动与管理：

```bash
cd /opt/pdf-split-merge
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f

# 更新前端文件后重启前端服务
sudo docker compose restart web
# 更新后端脚本后重启后端服务
sudo docker compose restart api
```

> 说明：默认将前端监听在 8080（容器 80），后端监听在 5600（API）。若宿主机的 80 端口空闲并且你希望前端直接对外使用 80，可将 `ports: "8080:80"` 改为 `"80:80"`。

### 5. 开放防火墙与云安全组

如果启用了 UFW，请放行 80/443：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

云服务器还需在控制台开放安全组规则（入站 80/443）。

## 四、域名与 HTTPS（推荐）

建议在宿主机使用 Nginx 做反向代理与证书管理，容器只负责静态服务：

1. 将域名解析到你的服务器公网 IP。
2. 安装 Nginx 与 Certbot：

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

3. 配置反向代理（示例：`/etc/nginx/sites-available/pdf-tools`），将所有 HTTP 强制跳转到 HTTPS，并分别反向代理到前端与后端：

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

4. 启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/pdf-tools /etc/nginx/sites-enabled/pdf-tools
sudo nginx -t && sudo systemctl reload nginx
```

5. 签发 HTTPS：

```bash
sudo certbot --nginx -d yourdomain.com
```

（替代方案：Caddy 自动证书，或 Nginx Docker 化，均可根据你的习惯选择。）

## 五、Nginx 直接部署（不使用 Docker）

1. 将站点文件放到 `/var/www/pdf-split-merge`。
2. 新建站点配置（`/etc/nginx/sites-available/pdf-split-merge`）：

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

3. 启用与重载：

```bash
sudo ln -s /etc/nginx/sites-available/pdf-split-merge /etc/nginx/sites-enabled/pdf-split-merge
sudo nginx -t && sudo systemctl reload nginx
```

4. 配置 HTTPS：同上使用 `certbot --nginx`。

## 六、离线/内网环境（本地化 pdf-lib）

项目默认通过 CDN 引用 `pdf-lib`。如服务器无法访问外网，可改为本地引入：

1. 下载浏览器版 `pdf-lib.min.js` 到你的站点目录（例如 `/opt/pdf-split-merge/site/vendor/pdf-lib.min.js`）。
2. 修改 `index.html` 中的脚本引入，改为本地：

```html
<!-- 将原来的 CDN 引用替换为本地文件 -->
<script src="vendor/pdf-lib.min.js"></script>
```

完成后，整个应用不再依赖外部网络即可正常使用。

## 七、配置与自定义

- SEO 标题与品牌文案：在 `index.html` 可编辑 `<title>` 与页头品牌文字。
- 默认输出文件名：已支持自定义输出文件名（Split 与 Merge 卡片均有输入框）。
- 主题切换：页头按钮 `Toggle Theme` 可在浅色与深色间切换（自动记忆选择）。

## 八、常见问题（FAQ）

- 浏览器支持：Chrome、Edge、Firefox、Safari 及移动端现代浏览器。依赖 File API、Blob、URL.createObjectURL、拖拽事件、localStorage、`crypto.randomUUID` 等。
- 隐私安全：不上传任何 PDF 到服务器，处理在浏览器内存完成。
- 大文件性能：浏览器内存消耗由文件大小与数量决定，建议合理控制。
- 端口占用：Compose 默认前端使用 `8080:80`，后端使用 `5600:5600`；如需对外用 80/443，建议用宿主机 Nginx 反代。
- 白屏或脚本错误：检查三件套是否都在站点目录；如内网环境，确认已本地化 `pdf-lib` 并正确引用。

## 九、更新与回滚

- 镜像方式：替换 `site/` 文件 → 重新构建镜像 → 重启容器；保留旧镜像标签可回滚。
- Compose 方式：替换 `site/` 文件 → `docker compose restart`；可使用版本控制或备份目录实现回滚。

## 十、命令速查（可直接复制）

```bash
# 1) 安装 Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release; echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2) 使用 Compose（前端+后端）
sudo mkdir -p /opt/pdf-split-merge/site
sudo mkdir -p /opt/pdf-split-merge/api
# 上传前端三件套到 /opt/pdf-split-merge/site
# 上传 server.py 到 /opt/pdf-split-merge/api

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

—— 完 ——
