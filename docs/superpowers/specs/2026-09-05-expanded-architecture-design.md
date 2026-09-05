# Expanded Architecture: Auth, Admin, Redis, Monitoring

## Overview

Expand the 3-tier Motor Shop from 4 services to 10 services across 3 phases:
- Phase 1: JWT auth, admin CRUD page, server-side search, image upload via MinIO pre-signed URLs
- Phase 2: Redis caching, dedicated Nginx reverse proxy
- Phase 3: Prometheus + Grafana + Node Exporter monitoring stack

## Architecture (Final State)

10 Docker Compose services across 2 networks:

| Service | Image | Exposed Port | Network |
|---------|-------|-------------|---------|
| nginx-proxy | nginx:1.27-alpine | 8000:80 | backend_network |
| frontend | custom (static Nginx) | internal | backend_network |
| backend | custom (Flask+Gunicorn) | internal | backend_network, monitoring_network |
| mariadb | custom (MariaDB 11) | internal | backend_network |
| minio | custom (MinIO) | internal | backend_network |
| redis | redis:7-alpine | internal | backend_network |
| prometheus | prom/prometheus | 9090:9090 | monitoring_network, backend_network |
| grafana | grafana/grafana | 3000:3000 | monitoring_network |
| node-exporter | prom/node-exporter | internal | monitoring_network |

Nginx proxy is the single entry point:
- / -> frontend:80 (static SPA)
- /api/ -> backend:5000
- /images/ -> minio:9000/product-image/

## Phase 1: JWT Auth + Admin + Search + Image Upload

### JWT Authentication

- Single admin user, credentials from env vars (ADMIN_USERNAME, ADMIN_PASSWORD)
- POST /api/auth/login: validates credentials, returns JWT (1-hour expiry, HS256)
- @token_required decorator on admin-only endpoints
- Frontend stores token in localStorage, sends via Authorization: Bearer header
- Dependencies: PyJWT

### Admin Page (React)

- /admin/login: login form, redirects to /admin on success
- /admin: protected route, redirects to /admin/login if no valid token
- Dashboard layout with sidebar: Products, Contacts, Feedback
- Products tab: table listing, add form (with image upload), edit, delete (with confirmation)
- Contacts tab: read-only table of all contact submissions
- Feedback tab: read-only table of all feedback with product name
- Styled using ui-ux-pro-max plugin

### Image Upload

- Backend generates pre-signed PUT URL via boto3 (MinIO-compatible S3 endpoint)
- GET /api/upload/presign?filename=product-id/thumbnail.png (JWT required)
- Frontend uploads image directly to MinIO via pre-signed URL
- MinIO endpoint configured via MINIO_ENDPOINT env var
- Dependencies: boto3

### Server-Side Search

- GET /api/products/search?q=term
- SQLAlchemy LIKE query on name and category columns (case-insensitive)
- Frontend HomePage calls this endpoint instead of client-side filtering

### Phase 1 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/products/search?q= | No | Server-side search |
| POST | /api/products/ | JWT | Add product |
| PUT | /api/products/id | JWT | Update product |
| DELETE | /api/products/id | JWT | Delete product |
| GET | /api/contacts/ | JWT | List all contacts |
| GET | /api/upload/presign?filename= | JWT | MinIO pre-signed URL |

### Phase 1 Files

Backend new:
- app/auth/__init__.py, app/auth/routes.py: login endpoint
- app/middleware.py: @token_required decorator
- app/upload/__init__.py, app/upload/routes.py: pre-signed URL

Backend modified:
- app/__init__.py: register auth, upload blueprints; add JWT_SECRET, ADMIN config, MINIO config
- app/products/routes.py: add search, add, update, delete endpoints
- app/contact/routes.py: add GET list endpoint
- pyproject.toml: add PyJWT, boto3

Frontend new:
- src/pages/AdminLoginPage.jsx
- src/pages/AdminPage.jsx

Frontend modified:
- src/App.jsx: add /admin routes
- src/pages/HomePage.jsx: server-side search

## Phase 2: Redis Caching + Nginx Reverse Proxy

### Redis Caching

- Redis 7 Alpine container on backend_network
- flask-caching with Redis backend, configured via REDIS_URL env var
- Cached endpoints with 5-minute TTL:
  - GET /api/products/: key products:list
  - GET /api/products/categories/: key products:categories
  - GET /api/products/id/info: key products:detail:id
- Cache invalidation: admin CRUD (add/update/delete) clears all product cache keys
- AWS mapping: ElastiCache Redis

### Nginx Reverse Proxy

- New nginx-proxy container, single entry point on port 8000
- Config at infra/nginx/proxy.conf:
  - / -> http://frontend:80
  - /api/ -> http://backend:5000/api/
  - /images/ -> http://minio:9000/product-image/
- Frontend Nginx simplified to static-only (infra/nginx/frontend.conf)
- Backend and frontend no longer expose ports to host
- AWS mapping: Application Load Balancer

### Phase 2 Files

Backend modified:
- pyproject.toml: add flask-caching, redis
- app/__init__.py: init Flask-Caching
- app/products/routes.py: cache decorators + invalidation

Infra new:
- infra/nginx/proxy.conf
- infra/nginx/frontend.conf (replaces nginx.conf)

Infra modified:
- docker-compose.yml: add redis, nginx-proxy; remove port exposure from frontend/backend

## Phase 3: Monitoring

### Prometheus

- Scrapes backend /metrics endpoint (auto-instrumented by prometheus-flask-instrumentator)
- Scrapes node-exporter:9100 for host metrics
- Config: infra/monitoring/prometheus.yml
- Port 9090 exposed for debugging

### Grafana

- Pre-configured with Prometheus datasource via provisioning
- Two auto-provisioned dashboards:
  1. Flask API: request rate, latency P50/P95/P99, error rate, top endpoints
  2. System: CPU, memory, disk I/O, network I/O
- Default login admin/admin
- Port 3000 exposed

### Node Exporter

- Standard prom/node-exporter
- Exposes host-level metrics, internal only, scraped by Prometheus

### Phase 3 Files

Backend modified:
- pyproject.toml: add prometheus-flask-instrumentator
- app/__init__.py: init Prometheus instrumentator

Infra new:
- infra/monitoring/prometheus.yml
- infra/monitoring/grafana/provisioning/datasources/prometheus.yml
- infra/monitoring/grafana/provisioning/dashboards/dashboard.yml
- infra/monitoring/grafana/dashboards/flask-api.json
- infra/monitoring/grafana/dashboards/system.json

Infra modified:
- docker-compose.yml: add prometheus, grafana, node-exporter, monitoring_network

## Environment Variables (Final)

Existing:
- MARIADB_ROOT_PASSWORD, MARIADB_DATABASE, MARIADB_USER, MARIADB_PASSWORD
- MINIO_ROOT_USER, MINIO_ROOT_PASSWORD

Phase 1:
- JWT_SECRET
- ADMIN_USERNAME, ADMIN_PASSWORD
- MINIO_ENDPOINT (default: minio:9000)

Phase 2:
- REDIS_URL (default: redis://redis:6379/0)

Phase 3:
- GF_SECURITY_ADMIN_PASSWORD (Grafana admin password)

## AWS Mapping

| Docker Compose | AWS |
|---------------|-----|
| nginx-proxy | ALB |
| frontend | S3 + CloudFront |
| backend | ECS Fargate |
| mariadb | RDS MariaDB |
| minio | S3 |
| redis | ElastiCache |
| prometheus + grafana | CloudWatch + X-Ray |
| node-exporter | CloudWatch Agent |

## Deferred

- CI/CD (GitHub Actions)
- Terraform IaC for AWS
- Database migrations (Flask-Migrate)
