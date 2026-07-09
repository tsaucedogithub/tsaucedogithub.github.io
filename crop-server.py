#!/usr/bin/env python3
"""Tiny local helper for the thumbnail crop tool.
Listens on :4001 and writes crop focal points into _data/thumb_crops.yml so the
Jekyll site picks them up (no manual editing). Local dev only."""
import http.server, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "_data", "thumb_crops.yml")
HEADER = ("# Thumbnail crop focal points, keyed by photo filename. Managed by the crop tool\n"
          "# (previews/crop.html). Values are CSS object-position, e.g. \"center\", \"70% 30%\".\n")


def load():
    crops = {}
    if os.path.exists(DATA):
        for line in open(DATA):
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            k, v = line.split(":", 1)
            crops[k.strip().strip('"')] = v.strip().strip('"')
    return crops


def save(crops):
    with open(DATA, "w") as f:
        f.write(HEADER)
        for k, v in sorted(crops.items()):
            f.write('"%s": "%s"\n' % (k, v))


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            crops = load()
            crops[body["file"]] = body.get("position", "center")
            save(crops)
            payload = json.dumps({"ok": True, "file": body["file"], "position": crops[body["file"]]})
            self.send_response(200)
        except Exception as e:
            payload = json.dumps({"ok": False, "error": str(e)})
            self.send_response(400)
        self._cors(); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(payload.encode())

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("crop-server listening on http://127.0.0.1:4001 -> writes _data/thumb_crops.yml")
    http.server.HTTPServer(("127.0.0.1", 4001), Handler).serve_forever()
