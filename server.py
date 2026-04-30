"""
STITCH — Wear the Culture  |  Pure Python Web Server
Run:   python server.py
Visit: http://localhost:8000
"""

import base64
import hashlib
import hmac
import http.server
import json
import os
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime

PORT       = 8000
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))   # serve from project root


def _load_env_file(path):
    """Tiny .env loader (stdlib only). Does not overwrite existing env vars."""
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


_load_env_file(os.path.join(STATIC_DIR, ".env"))

RAZORPAY_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_API_BASE   = "https://api.razorpay.com/v1"

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".woff2":"font/woff2",
    ".woff": "font/woff",
    ".ttf":  "font/ttf",
}

# In-memory stores (no DB needed yet)
orders     = []
wishlist   = []
newsletter = []


class Handler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"  [{timestamp}]  {format % args}")

    # ── GET ──────────────────────────────────────────────────────────
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path.rstrip("/") or "/"

        # ── API routes ───────────────────────────────────────────────
        if path == "/api/status":
            self._send_json({
                "status": "ok",
                "brand":  "STITCH — Wear the Culture",
                "uptime": "running",
                "time":   datetime.now().isoformat(),
            })
            return

        if path == "/api/orders":
            self._send_json({"orders": orders, "count": len(orders)})
            return

        if path == "/api/newsletter":
            self._send_json({"subscribers": newsletter, "count": len(newsletter)})
            return

        if path == "/api/wishlist":
            self._send_json({"wishlist": wishlist, "count": len(wishlist)})
            return

        # Expose only the public KEY_ID to the frontend; secret never leaves the server.
        if path == "/api/razorpay/key":
            self._send_json({"key_id": RAZORPAY_KEY_ID})
            return

        # ── Static files ─────────────────────────────────────────────
        if path == "/":
            file_path = os.path.join(STATIC_DIR, "index.html")
        else:
            relative  = path.lstrip("/")
            file_path = os.path.join(STATIC_DIR, relative)

        self._serve_file(file_path)

    # ── POST ─────────────────────────────────────────────────────────
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path

        body = self._read_body()

        if path == "/api/order":
            try:
                data = json.loads(body)
                data["order_id"]    = f"KNH{len(orders)+1:04d}"
                data["placed_at"]   = datetime.now().isoformat()
                data["status"]      = "confirmed"
                orders.append(data)
                print(f"\n  [+] New order #{data['order_id']} received!\n")
                self._send_json({
                    "success":  True,
                    "order_id": data["order_id"],
                    "message":  "Order placed successfully!",
                }, status=201)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=400)
            return

        if path == "/api/newsletter":
            try:
                data = json.loads(body)
                email = data.get("email", "").strip()
                if not email or "@" not in email:
                    self._send_json({"success": False, "error": "Invalid email"}, status=400)
                    return
                if email in newsletter:
                    self._send_json({"success": False, "error": "Already subscribed"}, status=409)
                    return
                newsletter.append(email)
                print(f"\n  [+] New subscriber: {email}\n")
                self._send_json({"success": True, "message": "You're on the list!"}, status=201)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=400)
            return

        if path == "/api/wishlist":
            try:
                data = json.loads(body)
                data["added_at"] = datetime.now().isoformat()
                wishlist.append(data)
                self._send_json({"success": True, "message": "Added to wishlist"}, status=201)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=400)
            return

        if path == "/api/razorpay/order":
            self._handle_create_order(body)
            return

        if path == "/api/razorpay/verify":
            self._handle_verify_payment(body)
            return

        self._send_json({"error": "Route not found"}, status=404)

    # ── RAZORPAY HANDLERS ────────────────────────────────────────────
    def _handle_create_order(self, body):
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            self._send_json({"success": False, "error": "Razorpay keys not configured"}, status=500)
            return

        try:
            data = json.loads(body or b"{}")
        except Exception:
            self._send_json({"success": False, "error": "Invalid JSON"}, status=400)
            return

        amount = data.get("amount")
        currency = data.get("currency", "INR")
        receipt = data.get("receipt") or f"rcpt_{int(datetime.now().timestamp())}"

        if not isinstance(amount, int) or amount < 100:
            self._send_json(
                {"success": False, "error": "Amount must be an integer >= 100 paise"},
                status=400,
            )
            return

        payload = json.dumps({
            "amount":   amount,
            "currency": currency,
            "receipt":  receipt,
        }).encode("utf-8")

        auth = base64.b64encode(
            f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode("utf-8")
        ).decode("ascii")

        req = urllib.request.Request(
            f"{RAZORPAY_API_BASE}/orders",
            data=payload,
            method="POST",
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Basic {auth}",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                rp = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            status = 401 if e.code == 401 else 500
            print(f"  [!] Razorpay create-order failed ({e.code}): {err_body}")
            self._send_json(
                {"success": False, "error": "Razorpay order creation failed"},
                status=status,
            )
            return
        except Exception as e:
            print(f"  [!] Razorpay create-order error: {e}")
            self._send_json({"success": False, "error": "Network error"}, status=500)
            return

        print(f"\n  [+] Razorpay order created: {rp.get('id')} ({amount} paise)\n")
        self._send_json({
            "success":  True,
            "order_id": rp.get("id"),
            "amount":   rp.get("amount"),
            "currency": rp.get("currency"),
            "receipt":  rp.get("receipt"),
            "key_id":   RAZORPAY_KEY_ID,
        })

    def _handle_verify_payment(self, body):
        try:
            data = json.loads(body or b"{}")
        except Exception:
            self._send_json({"success": False, "error": "Invalid JSON"}, status=400)
            return

        order_id   = data.get("razorpay_order_id")
        payment_id = data.get("razorpay_payment_id")
        signature  = data.get("razorpay_signature")

        if not (order_id and payment_id and signature):
            self._send_json({"success": False, "error": "Missing required fields"}, status=400)
            return

        message = f"{order_id}|{payment_id}".encode("utf-8")
        expected = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            print(f"  [!] Signature mismatch for order {order_id}")
            self._send_json({"success": False, "error": "Signature verification failed"}, status=400)
            return

        # Record the verified payment alongside other orders.
        record = {
            "order_id":   f"KNH{len(orders)+1:04d}",
            "razorpay_order_id":   order_id,
            "razorpay_payment_id": payment_id,
            "customer":   data.get("customer", {}),
            "amount":     data.get("amount"),
            "items":      data.get("items", []),
            "placed_at":  datetime.now().isoformat(),
            "status":     "paid",
        }
        orders.append(record)
        print(f"\n  [+] Payment verified ✔  {record['order_id']}  ({payment_id})\n")

        self._send_json({
            "success":  True,
            "order_id": record["order_id"],
            "message":  "Payment verified",
        })

    # ── OPTIONS (CORS preflight) ──────────────────────────────────────
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ── HELPERS ───────────────────────────────────────────────────────
    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length)

    def _serve_file(self, file_path):
        # Security: prevent path traversal
        real_static = os.path.realpath(STATIC_DIR)
        real_file   = os.path.realpath(file_path)
        if not real_file.startswith(real_static):
            self._send_json({"error": "Forbidden"}, status=403)
            return

        if not os.path.isfile(file_path):
            if os.path.isfile(file_path + ".html"):
                file_path = file_path + ".html"
            else:
                self._send_error_page(404, "Page Not Found")
                return

        ext  = os.path.splitext(file_path)[1].lower()
        mime = MIME_TYPES.get(ext, "application/octet-stream")

        with open(file_path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type",   mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control",  "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content)

    def _send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_error_page(self, code, message):
        html = f"""<!DOCTYPE html>
<html><head><title>{code} — STITCH</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Space+Grotesk&display=swap');
  body {{ font-family: 'Space Grotesk', sans-serif; background: #0a0a0a; color: #f5f5f0;
         display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }}
  .box {{ text-align:center; }}
  h1 {{ font-family:'Syne',sans-serif; font-size:7rem; margin:0; color:#c8f53f; opacity:0.4; letter-spacing:-0.04em; }}
  p  {{ font-size:1.1rem; color:#888; margin-top:12px; }}
  a  {{ color:#c8f53f; text-decoration:none; font-weight:600; }}
  a:hover {{ text-decoration:underline; }}
</style></head>
<body><div class="box">
  <h1>{code}</h1>
  <p>{message}</p>
  <p style="margin-top:24px"><a href="/">← Back to STITCH</a></p>
</div></body></html>"""
        body = html.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type",   "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


# ── START ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    os.chdir(STATIC_DIR)
    server = http.server.HTTPServer(("", PORT), Handler)

    print()
    print("  * ---------------------------------------- *")
    print("       STITCH  |  Wear the Culture")
    print(f"       http://localhost:{PORT}")
    print("  * ---------------------------------------- *")
    print()
    print("  GET  /                   -> index.html")
    print("  GET  /api/status         -> server health")
    print("  GET  /api/orders         -> all orders")
    print("  GET  /api/newsletter     -> subscribers")
    print("  GET  /api/wishlist       -> wishlist items")
    print()
    print("  POST /api/order          -> place an order")
    print("  POST /api/newsletter     -> subscribe email")
    print("  POST /api/wishlist       -> add to wishlist")
    print("  POST /api/razorpay/order -> create Razorpay order")
    print("  POST /api/razorpay/verify-> verify payment signature")
    print("  GET  /api/razorpay/key   -> public KEY_ID for checkout.js")
    print()
    print("  Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped. See you next drop!\n")
        server.server_close()
