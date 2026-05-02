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

# Authoritative product catalog. Frontend prices are display-only; the server
# alone decides what an order costs. Mirror this with main.js's PRODUCTS map.
# `in_stock=False` blocks the product from being ordered even if the client tries.
PRODUCT_CATALOG = {
    "plain-joggers":     {"name": "Signature Wide-Leg Joggers", "price": 699,  "in_stock": True},
    "printed-joggers":   {"name": "Gothic Cathedral Joggers",   "price": 999,  "in_stock": False},
    "thorn-tee":         {"name": "Thorn Tee",                  "price": 599,  "in_stock": False},
    "thorn-combo":       {"name": "Thorn Drop Bundle",          "price": 1399, "in_stock": False},
}
ALLOWED_SIZES = {"XS", "S", "M", "L", "XL", "XXL"}
MAX_QTY_PER_ITEM = 10

# Coupons. `discount_pct` = % off subtotal. `flat_off` = fixed ₹ off.
# `min_subtotal` = subtotal must be at least this much (in rupees) to apply.
COUPONS = {
    "STITCH10":  {"discount_pct": 10, "flat_off": 0,   "min_subtotal": 0,    "label": "10% OFF"},
    "DROP200":   {"discount_pct": 0,  "flat_off": 200, "min_subtotal": 1000, "label": "₹200 OFF on orders over ₹1000"},
    "WELCOME15": {"discount_pct": 15, "flat_off": 0,   "min_subtotal": 0,    "label": "15% off — first order"},
}


def apply_coupon(subtotal_rupees, code):
    """Return (final_total_rupees, discount_rupees, label).

    Raises ValueError if the code is invalid or doesn't meet conditions.
    """
    if not code:
        return subtotal_rupees, 0, None
    coupon = COUPONS.get(code.strip().upper())
    if not coupon:
        raise ValueError("Invalid coupon code")
    if subtotal_rupees < coupon["min_subtotal"]:
        raise ValueError(f"Coupon needs a minimum subtotal of ₹{coupon['min_subtotal']}")

    discount = (subtotal_rupees * coupon["discount_pct"] // 100) + coupon["flat_off"]
    final = max(1, subtotal_rupees - discount)  # never let total fall to 0
    return final, discount, coupon["label"]


def compute_cart_subtotal_rupees(items):
    """Validate cart items and return the trusted subtotal in rupees.

    Raises ValueError on any malformed input or out-of-stock product —
    caller maps that to HTTP 400.
    """
    if not isinstance(items, list) or not items:
        raise ValueError("Cart is empty")

    total_rupees = 0
    for raw in items:
        if not isinstance(raw, dict):
            raise ValueError("Invalid cart item")
        pid  = raw.get("id")
        size = raw.get("size")
        qty  = raw.get("qty", 1)

        product = PRODUCT_CATALOG.get(pid)
        if not product:
            raise ValueError(f"Unknown product: {pid!r}")
        if not product.get("in_stock", False):
            raise ValueError(f"{product['name']} is out of stock")
        if size not in ALLOWED_SIZES:
            raise ValueError(f"Invalid size: {size!r}")
        if not isinstance(qty, int) or qty < 1 or qty > MAX_QTY_PER_ITEM:
            raise ValueError(f"Invalid quantity for {pid!r}")

        total_rupees += product["price"] * qty

    return total_rupees


# Pending orders keyed by Razorpay order_id, populated when we create the order
# and consumed when the signature is verified. Holds the SERVER-computed
# amount and the SERVER-validated cart so verify can't be tricked.
pending_orders = {}

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
        # Decode percent-encoded characters (e.g. %20 → space) so filenames
        # with spaces or unicode actually match what's on disk.
        path   = urllib.parse.unquote(parsed.path).rstrip("/") or "/"

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

        if path == "/api/coupon/preview":
            self._handle_coupon_preview(body)
            return

        self._send_json({"error": "Route not found"}, status=404)

    # ── COUPON PREVIEW ───────────────────────────────────────────────
    def _handle_coupon_preview(self, body):
        """Validate cart + coupon and return the discount, without creating
        a Razorpay order. Used by the checkout UI to show 'You saved ₹X'
        before the user clicks Pay."""
        try:
            data = json.loads(body or b"{}")
        except Exception:
            self._send_json({"success": False, "error": "Invalid JSON"}, status=400)
            return

        items = data.get("items")
        code  = data.get("coupon")

        try:
            subtotal = compute_cart_subtotal_rupees(items)
            final_total, discount, label = apply_coupon(subtotal, code)
        except ValueError as e:
            self._send_json({"success": False, "error": str(e)}, status=400)
            return

        self._send_json({
            "success":      True,
            "subtotal":     subtotal,
            "discount":     discount,
            "total":        final_total,
            "coupon_label": label,
        })

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

        # Trust the server, not the client. Frontend sends only what the user
        # *wants* to buy; we look up actual prices in the catalog.
        items  = data.get("items")
        coupon = data.get("coupon")  # optional
        try:
            subtotal = compute_cart_subtotal_rupees(items)
            final_total, discount, coupon_label = apply_coupon(subtotal, coupon)
        except ValueError as e:
            self._send_json({"success": False, "error": str(e)}, status=400)
            return

        amount = final_total * 100  # paise
        if amount < 100:
            self._send_json(
                {"success": False, "error": "Order total must be at least ₹1"},
                status=400,
            )
            return

        currency = "INR"
        receipt = f"rcpt_{int(datetime.now().timestamp())}"

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

        rzp_order_id = rp.get("id")
        # Stash the server-trusted amount + items so /verify can finalize
        # without re-trusting whatever the client sends back.
        pending_orders[rzp_order_id] = {
            "amount":       amount,
            "subtotal":     subtotal,
            "discount":     discount,
            "coupon":       coupon.strip().upper() if coupon else None,
            "coupon_label": coupon_label,
            "items":        items,
            "created_at":   datetime.now().isoformat(),
        }

        print(f"\n  [+] Razorpay order created: {rzp_order_id} ({amount} paise, "
              f"discount ₹{discount}{', coupon ' + coupon_label if coupon_label else ''})\n")
        self._send_json({
            "success":      True,
            "order_id":     rzp_order_id,
            "amount":       rp.get("amount"),
            "currency":     rp.get("currency"),
            "receipt":      rp.get("receipt"),
            "key_id":       RAZORPAY_KEY_ID,
            "subtotal":     subtotal,
            "discount":     discount,
            "coupon_label": coupon_label,
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

        # Look up the order WE created. If it isn't here, someone is replaying
        # or fabricating an order_id — refuse before we even check the signature.
        pending = pending_orders.get(order_id)
        if not pending:
            print(f"  [!] Verify called for unknown order {order_id}")
            self._send_json({"success": False, "error": "Unknown order"}, status=400)
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

        # Record the verified payment using ONLY server-trusted amount + items.
        record = {
            "order_id":   f"KNH{len(orders)+1:04d}",
            "razorpay_order_id":   order_id,
            "razorpay_payment_id": payment_id,
            "customer":   data.get("customer", {}),
            "subtotal":   pending["subtotal"],
            "discount":   pending["discount"],
            "coupon":     pending["coupon"],
            "amount":     pending["amount"],
            "items":      pending["items"],
            "placed_at":  datetime.now().isoformat(),
            "status":     "paid",
        }
        orders.append(record)
        # One-shot consumption — the same order_id can't be verified twice.
        pending_orders.pop(order_id, None)
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
    print("  POST /api/coupon/preview -> preview discount for cart + code")
    print("  GET  /api/razorpay/key   -> public KEY_ID for checkout.js")
    print()
    print("  Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped. See you next drop!\n")
        server.server_close()
