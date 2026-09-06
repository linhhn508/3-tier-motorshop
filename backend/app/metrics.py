import time
from flask import request, g
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


def init_metrics(app):
    @app.before_request
    def _start_timer():
        g._request_start = time.perf_counter()

    @app.after_request
    def _record_metrics(response):
        if request.path == "/metrics":
            return response
        duration = time.perf_counter() - getattr(g, "_request_start", time.perf_counter())
        endpoint = request.endpoint or "unknown"
        REQUEST_COUNT.labels(request.method, endpoint, response.status_code).inc()
        REQUEST_DURATION.labels(request.method, endpoint).observe(duration)
        return response

    @app.route("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}