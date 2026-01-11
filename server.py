import json
import sqlite3
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

db = sqlite3.connect("feedback.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, created_at INTEGER)")
db.commit()

class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()
    def do_GET(self):
        if self.path.startswith("/api/messages"):
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
        if self.path.startswith("/api/health"):
            body = json.dumps({"ok": True}).encode("utf-8")
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()
    def do_POST(self):
        if self.path.startswith("/api/messages"):
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
