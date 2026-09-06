# Phase 3: Monitoring (Prometheus + Grafana + Node Exporter) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monitoring stack (Prometheus + Grafana + Node Exporter) that auto-instruments the Flask API with request metrics and provides pre-configured dashboards for API and system monitoring.

**Architecture:** `prometheus-flask-instrumentator` auto-exposes a `/metrics` endpoint on the Flask backend. Prometheus scrapes both `/metrics` (Flask) and `node-exporter:9100` (host metrics) every 15 seconds. Grafana is pre-provisioned with a Prometheus datasource and two dashboards: Flask API metrics and System metrics. All three services run on a dedicated `monitoring_network`, with Prometheus also on `backend_network` to reach the backend.

**Tech Stack:** prometheus-client (Python), prom/prometheus (Docker), grafana/grafana (Docker), prom/node-exporter (Docker)

**Spec:** `docs/superpowers/specs/2026-09-05-expanded-architecture-design.md` — Phase 3 section

## Global Constraints

- Python 3.12+, managed with `uv`
- All files created via terminal (`cat >`) — WSL environment
- Existing tests must keep passing: `npx vitest run` (frontend), `uv run pytest` (backend)
- docker-compose.yml currently has `backend_network`; Phase 3 adds `monitoring_network`
- Backend served by Gunicorn with 4 workers
- Branch: `feature/implement-plans`

---

### Task 1: Instrument Flask with Prometheus Metrics

Add `prometheus-client` to the Flask backend with a custom metrics middleware. `prometheus-flask-instrumentator` is NOT compatible with Flask 3.x (requires Flask <2). Instead, use `prometheus-client` directly with a small `app/metrics.py` module.

**Files:**
- Modify: `backend/pyproject.toml` — add `prometheus-client`
- Create: `backend/app/metrics.py` — metrics middleware with Counter, Histogram, and `/metrics` endpoint
- Modify: `backend/app/__init__.py` — call `init_metrics(app)`
- Create: `backend/tests/test_metrics.py` — verify `/metrics` endpoint exists

**Interfaces:**
- Consumes: `create_app()` factory
- Produces: `GET /metrics` endpoint returning Prometheus text format

- [ ] **Step 1: Add dependency**

```bash
cd backend && uv add prometheus-client
```

- [ ] **Step 2: Create metrics module**

Create `backend/app/metrics.py`:

```python
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
```

This tracks:
- `http_requests_total` — counter of requests by method, endpoint, status
- `http_request_duration_seconds` — histogram of request latency

- [ ] **Step 3: Init metrics in app factory**

Add to `backend/app/__init__.py`, after `cache.init_app(app)`:

```python
from app.metrics import init_metrics
init_metrics(app)
```

- [ ] **Step 4: Write metrics test**

Create `backend/tests/test_metrics.py`:

```python
class TestMetrics:
    def test_metrics_endpoint_exists(self, client):
        resp = client.get("/metrics")
        assert resp.status_code == 200
        assert b"http_request" in resp.data

    def test_metrics_tracks_requests(self, client, seed_products):
        client.get("/api/products/")
        resp = client.get("/metrics")
        assert resp.status_code == 200
        body = resp.data.decode()
        assert "http_request_duration_seconds" in body
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && uv run pytest -v
```

Expected: all existing tests + 2 new metrics tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add Prometheus metrics instrumentation to Flask"
```

---

### Task 2: Prometheus Configuration

Create the Prometheus config file that scrapes the Flask backend and Node Exporter.

**Files:**
- Create: `infra/monitoring/prometheus.yml` — scrape config

**Interfaces:**
- Consumes: `backend:5000/metrics` and `node-exporter:9100/metrics`
- Produces: Prometheus config file mounted into the container

- [ ] **Step 1: Create prometheus.yml**

Create `infra/monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'flask-backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['backend:5000']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

- [ ] **Step 2: Commit**

```bash
git add infra/monitoring/
git commit -m "infra: add Prometheus scrape config"
```

---

### Task 3: Grafana Provisioning (Datasource + Dashboards)

Create Grafana provisioning files so the Prometheus datasource and two dashboards are auto-loaded on startup — no manual configuration needed.

**Files:**
- Create: `infra/monitoring/grafana/provisioning/datasources/prometheus.yml` — auto-register Prometheus
- Create: `infra/monitoring/grafana/provisioning/dashboards/dashboard.yml` — tell Grafana where to find dashboard JSON files
- Create: `infra/monitoring/grafana/dashboards/flask-api.json` — Flask API dashboard
- Create: `infra/monitoring/grafana/dashboards/system.json` — System metrics dashboard

**Interfaces:**
- Consumes: Prometheus at `http://prometheus:9090`
- Produces: two pre-loaded Grafana dashboards

- [ ] **Step 1: Create datasource provisioning**

Create `infra/monitoring/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

- [ ] **Step 2: Create dashboard provisioning config**

Create `infra/monitoring/grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: false
```

- [ ] **Step 3: Create Flask API dashboard**

Create `infra/monitoring/grafana/dashboards/flask-api.json`:

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "links": [],
  "panels": [
    {
      "title": "Request Rate (req/s)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "rate(http_request_duration_seconds_count{job=\"flask-backend\"}[1m])",
          "legendFormat": "{{method}} {{handler}} {{status}}",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "reqps" },
        "overrides": []
      }
    },
    {
      "title": "Latency P50 / P95 / P99",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"flask-backend\"}[5m]))",
          "legendFormat": "P50",
          "refId": "A"
        },
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"flask-backend\"}[5m]))",
          "legendFormat": "P95",
          "refId": "B"
        },
        {
          "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job=\"flask-backend\"}[5m]))",
          "legendFormat": "P99",
          "refId": "C"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "s" },
        "overrides": []
      }
    },
    {
      "title": "Error Rate (5xx)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "rate(http_request_duration_seconds_count{job=\"flask-backend\",status=~\"5..\"}[1m])",
          "legendFormat": "{{handler}} 5xx",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "reqps" },
        "overrides": []
      }
    },
    {
      "title": "Top Endpoints by Request Count",
      "type": "bargauge",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "topk(10, sum by (handler) (increase(http_request_duration_seconds_count{job=\"flask-backend\"}[1h])))",
          "legendFormat": "{{handler}}",
          "refId": "A"
        }
      ],
      "options": {
        "orientation": "horizontal",
        "displayMode": "gradient"
      }
    }
  ],
  "schemaVersion": 39,
  "tags": ["flask", "api"],
  "templating": { "list": [] },
  "time": { "from": "now-1h", "to": "now" },
  "title": "Flask API",
  "uid": "flask-api"
}
```

- [ ] **Step 4: Create System dashboard**

Create `infra/monitoring/grafana/dashboards/system.json`:

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "links": [],
  "panels": [
    {
      "title": "CPU Usage (%)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "CPU Usage",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "percent", "min": 0, "max": 100 },
        "overrides": []
      }
    },
    {
      "title": "Memory Usage",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes",
          "legendFormat": "Used",
          "refId": "A"
        },
        {
          "expr": "node_memory_MemTotal_bytes",
          "legendFormat": "Total",
          "refId": "B"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "bytes" },
        "overrides": []
      }
    },
    {
      "title": "Disk I/O",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "rate(node_disk_read_bytes_total[5m])",
          "legendFormat": "Read {{device}}",
          "refId": "A"
        },
        {
          "expr": "rate(node_disk_written_bytes_total[5m])",
          "legendFormat": "Write {{device}}",
          "refId": "B"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "Bps" },
        "overrides": []
      }
    },
    {
      "title": "Network I/O",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "" },
      "targets": [
        {
          "expr": "rate(node_network_receive_bytes_total{device!=\"lo\"}[5m])",
          "legendFormat": "Receive {{device}}",
          "refId": "A"
        },
        {
          "expr": "rate(node_network_transmit_bytes_total{device!=\"lo\"}[5m])",
          "legendFormat": "Transmit {{device}}",
          "refId": "B"
        }
      ],
      "fieldConfig": {
        "defaults": { "unit": "Bps" },
        "overrides": []
      }
    }
  ],
  "schemaVersion": 39,
  "tags": ["system", "node-exporter"],
  "templating": { "list": [] },
  "time": { "from": "now-1h", "to": "now" },
  "title": "System",
  "uid": "system-metrics"
}
```

- [ ] **Step 5: Commit**

```bash
git add infra/monitoring/
git commit -m "infra: add Grafana provisioning with Flask API and System dashboards"
```

---

### Task 4: Docker Compose — Add Monitoring Stack

Add Prometheus, Grafana, and Node Exporter services to docker-compose.yml. Create the `monitoring_network` and connect the backend to both networks.

**Files:**
- Modify: `docker-compose.yml` — add 3 services, add `monitoring_network`, connect backend to both networks
- Modify: `.env` — add `GF_SECURITY_ADMIN_PASSWORD`
- Modify: `.env.example` — add `GF_SECURITY_ADMIN_PASSWORD`

**Interfaces:**
- Consumes: `backend_network`, monitoring config files from Task 2 and 3
- Produces: Prometheus on port 9090, Grafana on port 3000, Node Exporter internal-only

- [ ] **Step 1: Add monitoring services to docker-compose.yml**

Add after the `reverse_proxy` service block:

```yaml
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infra/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    depends_on:
      backend:
        condition: service_started
    restart: unless-stopped
    networks:
      - monitoring_network
      - backend_network

  grafana:
    image: grafana/grafana
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_SECURITY_ADMIN_PASSWORD}
    volumes:
      - ./infra/monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./infra/monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    depends_on:
      prometheus:
        condition: service_started
    restart: unless-stopped
    networks:
      - monitoring_network

  node-exporter:
    image: prom/node-exporter
    container_name: node-exporter
    restart: unless-stopped
    networks:
      - monitoring_network
```

- [ ] **Step 2: Add backend to monitoring_network**

In the `backend` service, change `networks` to:

```yaml
    networks:
      - backend_network
      - monitoring_network
```

- [ ] **Step 3: Add monitoring_network**

In the `networks` section at the bottom:

```yaml
networks:
  backend_network:
    driver: bridge
  monitoring_network:
    driver: bridge
```

- [ ] **Step 4: Add GF_SECURITY_ADMIN_PASSWORD to env files**

```bash
echo "" >> .env
echo "# Grafana" >> .env
echo "GF_SECURITY_ADMIN_PASSWORD=admin" >> .env
```

Add to `.env.example`:

```
# Grafana
GF_SECURITY_ADMIN_PASSWORD=admin
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env .env.example
git commit -m "infra: add Prometheus, Grafana, Node Exporter to Docker Compose"
```

---

### Task 5: Integration Test

Rebuild and start all 9 services. Verify monitoring stack works end-to-end.

**Files:**
- No files created

**Interfaces:**
- Consumes: all services from docker-compose.yml

- [ ] **Step 1: Rebuild and start**

```bash
docker compose build backend
docker compose up -d
```

- [ ] **Step 2: Verify all 9 services are running**

```bash
docker compose ps
```

Expected: 9 services — reverse_proxy, frontend, backend, mariadb, minio, redis, prometheus, grafana, node-exporter.

- [ ] **Step 3: Verify /metrics endpoint**

```bash
curl -s http://localhost:8000/api/health
curl -s http://localhost:8000/api/products/ > /dev/null
curl -s http://localhost:5000/metrics 2>/dev/null | head -5 || \
  docker exec backend curl -s http://localhost:5000/metrics | head -5
```

Expected: Prometheus text format with `http_request_duration_seconds` metrics.

- [ ] **Step 4: Verify Prometheus scraping**

```bash
curl -s http://localhost:9090/api/v1/targets | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data['data']['activeTargets']:
    print(f\"{t['labels']['job']}: {t['health']}\")
"
```

Expected: `flask-backend: up` and `node-exporter: up`.

- [ ] **Step 5: Verify Grafana is accessible**

Open `http://localhost:3000` in browser. Login with `admin` / `admin`.

Verify:
1. Prometheus datasource appears in Settings → Data Sources
2. "Flask API" dashboard is listed under Dashboards
3. "System" dashboard is listed under Dashboards

- [ ] **Step 6: Generate traffic and check dashboards**

```bash
for i in $(seq 1 100); do curl -s http://localhost:8000/api/products/ > /dev/null; done
for i in $(seq 1 50); do curl -s http://localhost:8000/api/products/categories/ > /dev/null; done
```

Wait 30 seconds, then check the "Flask API" dashboard in Grafana — you should see:
- Request rate graph showing spikes
- Latency P50/P95/P99 values
- Top endpoints showing `/api/products/` with highest count

- [ ] **Step 7: Run test suites**

```bash
cd frontend && npx vitest run
cd ../backend && uv run pytest -v
```

Expected: all tests pass.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "feat: complete Phase 3 — Prometheus + Grafana + Node Exporter monitoring"
git push origin feature/implement-plans
```
