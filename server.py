from http.server import HTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

print("BozoBet V2 çalışıyor: http://localhost:5620")
HTTPServer(("localhost", 5620), Handler).serve_forever()
