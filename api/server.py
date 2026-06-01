import json
import mimetypes
import sqlite3
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os

SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
MIME_MAP = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".svg": "image/svg+xml",
}

db = sqlite3.connect("feedback.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, created_at INTEGER)")
db.commit()

def check_auth(handler):
    admin_key = os.environ.get("ADMIN_KEY") or ""
    if not admin_key:
        return True
    header_key = handler.headers.get("X-Admin-Key", "")
    return header_key == admin_key

def serve_static(handler, path):
    path = path.lstrip("/")
    if path == "" or path.endswith("/"):
        path = "index.html"
    filepath = os.path.normpath(os.path.join(SITE_DIR, path))
    if not filepath.startswith(os.path.normpath(SITE_DIR)):
        handler.send_response(403)
        handler.end_headers()
        return
    if not os.path.isfile(filepath):
        handler.send_response(404)
        handler.end_headers()
        return
    ext = os.path.splitext(filepath)[1].lower()
    mime = MIME_MAP.get(ext, "application/octet-stream")
    with open(filepath, "rb") as f:
        data = f.read()
    handler.send_response(200)
    handler.send_header("Content-Type", mime)
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)

class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/messages"):
            if not check_auth(self):
                self.send_response(401)
                self.cors()
                self.end_headers()
                return
            rows = db.execute("SELECT id,name,content,created_at FROM messages ORDER BY id DESC LIMIT 100").fetchall()
            data = [{"id": r[0], "name": r[1], "content": r[2], "createdAt": r[3]} for r in rows]
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path.startswith("/api/messages/public"):
            rows = db.execute("SELECT id,name,content,created_at FROM messages ORDER BY id DESC LIMIT 100").fetchall()
            data = [{"id": r[0], "name": r[1], "content": r[2], "createdAt": r[3]} for r in rows]
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path.startswith("/api/health"):
            body = json.dumps({"ok": True}).encode("utf-8")
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        serve_static(self, parsed.path)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/messages"):
            if not check_auth(self):
                self.send_response(401)
                self.cors()
                self.end_headers()
                return
            qs = parse_qs(parsed.query or "")
            mid = (qs.get("id", [""])[0] or "").strip()
            if mid:
                db.execute("DELETE FROM messages WHERE id=?", (mid,))
                db.commit()
                self.send_response(200)
                self.cors()
                self.end_headers()
                return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/auth"):
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except:
                payload = {}
            password = (payload.get("password") or "").strip()
            admin_key = os.environ.get("ADMIN_KEY") or ""
            if admin_key and password == admin_key:
                body = json.dumps({"token": admin_key}).encode("utf-8")
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            body = json.dumps({"error": "unauthorized"}).encode("utf-8")
            self.send_response(401)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path.startswith("/api/messages"):
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except:
                payload = {}
            content = (payload.get("content") or "").strip()
            name = (payload.get("name") or "Anonymous User").strip()
            if not content:
                body = json.dumps({"error": "empty"}).encode("utf-8")
                self.send_response(400)
                self.cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if len(content) > 2000:
                content = content[:2000]
            ts = int(time.time() * 1000)
            cur = db.execute("INSERT INTO messages(name,content,created_at) VALUES(?,?,?)", (name, content, ts))
            db.commit()
            rid = cur.lastrowid
            body = json.dumps({"id": rid, "name": name, "content": content, "createdAt": ts}).encode("utf-8")
            self.send_response(201)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

def main():
    HTTPServer(("0.0.0.0", 5600), Handler).serve_forever()

if __name__ == "__main__":
    main()
