# Phase 2: Redis Caching + Nginx Reverse Proxy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redis caching for product endpoints and an Nginx reverse proxy as the single entry point, so backend/frontend no longer expose ports directly.

**Architecture:** A new `redis` container provides a 5-minute TTL cache for read-heavy product endpoints. A new `nginx-proxy` container becomes the sole port-exposed service (8000:80), routing `/` to the frontend, `/api/` to the backend, and `/images/` to MinIO. The existing frontend Nginx config is simplified to static-file-only serving. Admin CRUD operations invalidate the product cache.

**Tech Stack:** flask-caching + redis (Python), Redis 7 Alpine (Docker), Nginx 1.27 Alpine (Docker)

**Spec:** `docs/superpowers/specs/2026-09-05-expanded-architecture-design.md` — Phase 2 section

## Global Constraints

- Python 3.12+, managed with `uv`
- Flask 3.x, SQLAlchemy, Gunicorn
- Redis 7 Alpine image
- Nginx 1.27 Alpine image
- All files created via terminal (`cat >`) — WSL environment, `create_file` tool does not work
- Existing tests must keep passing: `npx vitest run` (frontend, 57 tests), `cd backend && uv run pytest` (backend)
- `docker-compose.yml` uses `backend_network` bridge network
- Branch: `feature/implement-plans`

---

### Task 1: Redis Caching Backend

Add `flask-caching` with Redis backend to the Flask app. Cache the three read-heavy product endpoints. Invalidate all product cache keys on admin CRUD operations.

**Files:**
- Modify: `backend/pyproject.toml` — add `flask-caching` and `redis` dependencies
- Modify: `backend/app/__init__.py` — init Flask-Caching with Redis config
- Modify: `backend/app/products/routes.py` — add cache decorators on GET endpoints, add invalidation on POST/PUT/DELETE
- Create: `backend/tests/test_cache.py` — test cache hit/invalidation behavior
- Modify: `backend/tests/conftest.py` — add REDIS_URL env default for tests

**Interfaces:**
- Consumes: existing `create_app()`, `Product` model, `@token_required` decorator
- Produces: `cache` object exported from `app/__init__.py`; cached GET endpoints; cache invalidation on mutations

- [ ] **Step 1: Add dependencies**

```bash
cd backend && uv add flask-caching redis
```

Verify `pyproject.toml` now includes both packages.

- [ ] **Step 2: Init Flask-Caching in app factory**

Modify `backend/app/__init__.py`:

```python
# Add import at top
from flask_caching import Cache

# After db = SQLAlchemy()
cache = Cache()

# Inside create_app(), after CORS(app):
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
app.config["CACHE_TYPE"] = "RedisCache"
app.config["CACHE_REDIS_URL"] = redis_url
app.config["CACHE_DEFAULT_TIMEOUT"] = 300  # 5 minutes

# For testing, use simple cache (no Redis needed)
if testing:
    app.config["CACHE_TYPE"] = "SimpleCache"

cache.init_app(app)
```

- [ ] **Step 3: Add cache decorators to product GET endpoints**

Modify `backend/app/products/routes.py`:

```python
# Add import
from app import db, cache

# On index():
@bp.route("/", methods=["GET"])
@cache.cached(key_prefix="products:list")
def index():
    products = Product.query.all()
    return jsonify([p.to_list_dict() for p in products])

# On get_product():
@bp.route("/<product_id>/info", methods=["GET"])
@cache.cached(key_prefix="products:detail:%s")
def get_product(product_id):
    ...

# On categories():
@bp.route("/categories/", methods=["GET"])
@cache.cached(key_prefix="products:categories")
def categories():
    ...
```

Note: `@cache.cached(key_prefix="products:detail:%s")` auto-appends the URL path, so each product ID gets its own cache key.

- [ ] **Step 4: Add cache invalidation to CRUD endpoints**

In `backend/app/products/routes.py`, create a helper and call it after every mutation:

```python
def _invalidate_product_cache():
    cache.delete("products:list")
    cache.delete("products:categories")
    # Delete all detail keys by pattern — flask-caching doesn't support wildcard,
    # so delete the specific detail key when we know the product_id
    # For list/categories, clearing those two is sufficient since detail keys
    # expire naturally after TTL

# In add(), after db.session.commit():
    _invalidate_product_cache()
    return jsonify({"message": "Product added", "id": data["id"]}), 201

# In update(), after db.session.commit():
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product updated"})

# In delete(), after db.session.commit():
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product removed"})
```

- [ ] **Step 5: Fix cache key for product detail**

The `@cache.cached(key_prefix="products:detail:%s")` doesn't interpolate `product_id` automatically. Use `make_cache_key` or switch to explicit caching:

```python
@bp.route("/<product_id>/info", methods=["GET"])
def get_product(product_id):
    cache_key = f"products:detail:{product_id}"
    cached = cache.get(cache_key)
    if cached:
        return jsonify(cached)
    product = db.session.get(Product, product_id)
    if product:
        data = product.to_detail_dict()
        cache.set(cache_key, data)
        return jsonify(data)
    return jsonify({"error": "Product not found"}), 404
```

- [ ] **Step 6: Add REDIS_URL to test conftest**

Modify `backend/tests/conftest.py`:

```python
@pytest.fixture
def app():
    os.environ.setdefault("JWT_SECRET", "test-secret-key")
    os.environ.setdefault("ADMIN_USERNAME", "admin")
    os.environ.setdefault("ADMIN_PASSWORD", "admin123")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    app = create_app(testing=True)
    ...
```

Since `testing=True` uses `SimpleCache`, no real Redis is needed for unit tests.

- [ ] **Step 7: Write cache tests**

Create `backend/tests/test_cache.py`:

```python
from app import cache


class TestCaching:
    def test_product_list_is_cached(self, client, seed_products):
        resp1 = client.get("/api/products/")
        assert resp1.status_code == 200
        assert len(resp1.get_json()) == 2

        cached = cache.get("products:list")
        assert cached is not None

    def test_product_detail_is_cached(self, client, seed_products):
        resp = client.get("/api/products/po-akrapovic-r1/info")
        assert resp.status_code == 200

        cached = cache.get("products:detail:po-akrapovic-r1")
        assert cached is not None
        assert cached["id"] == "po-akrapovic-r1"

    def test_categories_cached(self, client, seed_products):
        resp = client.get("/api/products/categories/")
        assert resp.status_code == 200

        cached = cache.get("products:categories")
        assert cached is not None

    def test_add_product_invalidates_cache(self, client, seed_products):
        client.get("/api/products/")
        assert cache.get("products:list") is not None

        import jwt, os
        token = jwt.encode({"user": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")
        client.post("/api/products/", json={
            "id": "new-prod", "name": "New", "price": 100, "category": "Test"
        }, headers={"Authorization": f"Bearer {token}"})

        assert cache.get("products:list") is None

    def test_delete_product_invalidates_cache(self, client, seed_products):
        client.get("/api/products/")
        client.get("/api/products/po-akrapovic-r1/info")
        assert cache.get("products:list") is not None

        import jwt, os
        token = jwt.encode({"user": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")
        client.delete("/api/products/po-akrapovic-r1",
                       headers={"Authorization": f"Bearer {token}"})

        assert cache.get("products:list") is None
        assert cache.get("products:detail:po-akrapovic-r1") is None
```

- [ ] **Step 8: Run all backend tests**

```bash
cd backend && uv run pytest -v
```

Expected: all existing tests + new cache tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: add Redis caching for product endpoints with invalidation"
```

---

### Task 2: Docker Compose — Add Redis Service

Add the Redis container and REDIS_URL env var to docker-compose.yml and .env files.

**Files:**
- Modify: `docker-compose.yml` — add `redis` service, add `REDIS_URL` to backend environment
- Modify: `.env` — add `REDIS_URL`
- Modify: `.env.example` — add `REDIS_URL`

**Interfaces:**
- Consumes: `backend_network` from docker-compose.yml
- Produces: Redis service on `backend_network`, accessible at `redis://redis:6379/0`

- [ ] **Step 1: Add Redis service to docker-compose.yml**

Add after the `minio` service block:

```yaml
  redis:
    image: redis:7-alpine
    container_name: redis
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - backend_network
```

- [ ] **Step 2: Add REDIS_URL to backend environment**

In the `backend` service `environment` section, add:

```yaml
      - REDIS_URL=redis://redis:6379/0
```

Add `redis` to backend's `depends_on`:

```yaml
    depends_on:
      mariadb:
        condition: service_healthy
      minio:
        condition: service_healthy
      redis:
        condition: service_healthy
```

- [ ] **Step 3: Add REDIS_URL to .env and .env.example**

```bash
echo "REDIS_URL=redis://redis:6379/0" >> .env
```

Add to `.env.example`:

```
REDIS_URL=redis://redis:6379/0
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env .env.example
git commit -m "infra: add Redis service to Docker Compose"
```

---

### Task 3: Nginx Reverse Proxy

Create a dedicated Nginx reverse proxy container as the single entry point. The frontend container no longer proxies API/image requests — it serves static files only. Only the proxy exposes port 8000.

**Files:**
- Create: `infra/nginx/proxy.conf` — reverse proxy config (/ -> frontend, /api/ -> backend, /images/ -> minio)
- Modify: `infra/nginx/nginx.conf` — simplify to static-only serving (remove /api/ and /images/ location blocks)
- Modify: `docker-compose.yml` — add `nginx-proxy` service, remove `ports` from `frontend` and `backend`, update frontend depends_on
- Modify: `infra/Dockerfile/frontend/Dockerfile` — use simplified nginx.conf

**Interfaces:**
- Consumes: `frontend` (port 80), `backend` (port 5000), `minio` (port 9000) on `backend_network`
- Produces: single entry point at host port 8000

- [ ] **Step 1: Create proxy.conf**

Create `infra/nginx/proxy.conf`:

```nginx
upstream frontend_upstream {
    server frontend:80;
}

upstream backend_upstream {
    server backend:5000;
}

upstream minio_upstream {
    server minio:9000;
}

server {
    listen 80;
    server_name _;

    # Frontend SPA
    location / {
        proxy_pass http://frontend_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend_upstream/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO product images
    location /images/ {
        proxy_pass http://minio_upstream/product-image/;
        proxy_set_header Host minio:9000;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 2: Simplify frontend nginx.conf to static-only**

Replace `infra/nginx/nginx.conf` with:

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Remove the `/api/` and `/images/` location blocks — the proxy handles those now.

- [ ] **Step 3: Update docker-compose.yml**

Add `nginx-proxy` service:

```yaml
  nginx-proxy:
    image: nginx:1.27-alpine
    container_name: nginx-proxy
    ports:
      - "8000:80"
    volumes:
      - ./infra/nginx/proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_started
    restart: unless-stopped
    networks:
      - backend_network
```

Remove `ports` from the `frontend` service (delete `- "8000:80"` line).

Remove `ports` from the `backend` service (delete `- "5000:5000"` line).

- [ ] **Step 4: Verify the frontend Dockerfile still uses nginx.conf**

The `infra/Dockerfile/frontend/Dockerfile` already copies `infra/nginx/nginx.conf` — no change needed since we modified that file in-place.

- [ ] **Step 5: Commit**

```bash
git add infra/nginx/ docker-compose.yml
git commit -m "infra: add Nginx reverse proxy as single entry point"
```

---

### Task 4: Integration Test

Bring up all services and verify the full stack works through the proxy.

**Files:**
- No files created

**Interfaces:**
- Consumes: all services from docker-compose.yml

- [ ] **Step 1: Build and start all services**

```bash
docker compose build && docker compose up -d
```

Wait for all containers to be healthy:

```bash
docker compose ps
```

Expected: 6 services running (nginx-proxy, frontend, backend, mariadb, minio, redis).

- [ ] **Step 2: Test proxy routes**

```bash
# Health check via proxy
curl -s http://localhost:8000/api/health | jq .

# Product list via proxy
curl -s http://localhost:8000/api/products/ | jq '.[0]'

# Frontend loads via proxy
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/

# Image proxy (should return image binary or 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/images/lop-michelin-city-grip-2/thumbnail.png
```

Expected: 200 for all.

- [ ] **Step 3: Test caching**

```bash
# First request populates cache
curl -s http://localhost:8000/api/products/ > /dev/null

# Check Redis has the key
docker exec redis redis-cli keys "products:*"
```

Expected: at least `products:list` key present.

- [ ] **Step 4: Test cache invalidation**

```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Add a product (should invalidate cache)
curl -s -X POST http://localhost:8000/api/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id":"test-cache","name":"Test Cache","price":100,"category":"Test"}'

# Check cache is cleared
docker exec redis redis-cli keys "products:*"

# Clean up
curl -s -X DELETE http://localhost:8000/api/products/test-cache \
  -H "Authorization: Bearer $TOKEN"
```

Expected: no `products:list` key after POST.

- [ ] **Step 5: Run frontend and backend test suites**

```bash
cd frontend && npx vitest run
cd ../backend && uv run pytest -v
```

Expected: all tests pass (frontend tests don't go through Docker, so they're unaffected).

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: complete Phase 2 — Redis caching + Nginx reverse proxy"
git push origin feature/implement-plans
```
