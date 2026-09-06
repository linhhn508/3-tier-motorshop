# Motor Shop Backend

Flask REST API with MariaDB, MinIO, Redis caching, and JWT authentication.

## Redis Caching Demo

The backend caches product endpoints in Redis with a 5-minute TTL. Admin CRUD operations invalidate the cache so users always see fresh data.

### Prerequisites

```bash
docker compose up -d
```

### 1. Verify Redis is empty

```bash
docker exec redis redis-cli KEYS "*"
# (empty)
```

### 2. First request — cache MISS (queries MariaDB)

```bash
curl -s http://localhost:8000/api/products/ | python3 -m json.tool | head -5
```

Check Redis now has the cached key:

```bash
docker exec redis redis-cli KEYS "*"
# flask_cache_products:list
```

Check TTL (seconds remaining out of 300):

```bash
docker exec redis redis-cli TTL "flask_cache_products:list"
# 298
```

### 3. Second request — cache HIT (no DB query)

```bash
curl -s http://localhost:8000/api/products/ | python3 -c "import sys,json; print(len(json.load(sys.stdin)), 'products')"
# 9 products (served from Redis memory, no MariaDB query)
```

### 4. Add a product — cache INVALIDATED

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Add product
curl -s -X POST http://localhost:8000/api/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id":"demo-redis","name":"Demo Redis","price":100,"category":"Test"}'
# {"id":"demo-redis","message":"Product added"}

# Cache is cleared
docker exec redis redis-cli KEYS "*"
# (empty — products:list was deleted by _invalidate_product_cache())
```

### 5. Next request — cache MISS again (fresh from MariaDB)

```bash
curl -s http://localhost:8000/api/products/ | python3 -c "import sys,json; print(len(json.load(sys.stdin)), 'products')"
# 10 products (includes new "Demo Redis" product)

docker exec redis redis-cli KEYS "*"
# flask_cache_products:list (re-cached with fresh data)
```

### 6. Delete the test product — cache INVALIDATED again

```bash
curl -s -X DELETE http://localhost:8000/api/products/demo-redis \
  -H "Authorization: Bearer $TOKEN"
# {"message":"Product removed"}

docker exec redis redis-cli KEYS "*"
# (empty)

curl -s http://localhost:8000/api/products/ | python3 -c "import sys,json; print(len(json.load(sys.stdin)), 'products')"
# 9 products (back to original)
```

### How it works

```
GET /api/products/
  → Redis has key? → YES → return cached response (~ 0.1ms)
  → Redis has key? → NO  → query MariaDB → store in Redis (TTL 300s) → return

POST/PUT/DELETE /api/products/
  → write to MariaDB → delete "products:list" and "products:categories" from Redis
  → next GET fetches fresh data from MariaDB and re-caches it
```

### Cached endpoints

| Endpoint | Cache Key | TTL |
|----------|-----------|-----|
| `GET /api/products/` | `products:list` | 300s |
| `GET /api/products/<id>/info` | `products:detail:<id>` | 300s |
| `GET /api/products/categories/` | `products:categories` | 300s |

### Cache invalidation triggers

| Action | Keys deleted |
|--------|-------------|
| `POST /api/products/` (add) | `products:list`, `products:categories` |
| `PUT /api/products/<id>` (update) | `products:list`, `products:categories`, `products:detail:<id>` |
| `DELETE /api/products/<id>` (delete) | `products:list`, `products:categories`, `products:detail:<id>` |

### Performance Benchmark

Compare response times with and without Redis cache.

#### Single request latency

```bash
# Flush cache first
docker exec redis redis-cli FLUSHALL

# Cache MISS — hits MariaDB
curl -s -o /dev/null -w "Cache MISS: %{time_total}s\n" http://localhost:8000/api/products/

# Cache HIT — served from Redis
curl -s -o /dev/null -w "Cache HIT:  %{time_total}s\n" http://localhost:8000/api/products/
```

Expected output:

```
Cache MISS: 0.025s
Cache HIT:  0.008s
```

#### Bulk benchmark (200 requests)

```bash
echo "=== With Redis cache (200 requests) ==="
curl -s http://localhost:8000/api/products/ > /dev/null  # warm cache
time (for i in $(seq 1 200); do curl -s http://localhost:8000/api/products/ > /dev/null; done)

echo ""
echo "=== Without cache — every request hits MariaDB ==="
docker exec redis redis-cli FLUSHALL > /dev/null
docker exec redis redis-cli CONFIG SET maxmemory 0 > /dev/null  # disable cache temporarily
# Stop caching by flushing after each request
time (for i in $(seq 1 200); do
  curl -s http://localhost:8000/api/products/ > /dev/null
  docker exec redis redis-cli FLUSHALL > /dev/null
done)
docker exec redis redis-cli CONFIG SET maxmemory 67108864 > /dev/null  # restore 64mb
```

#### Per-request average with timing

```bash
docker exec redis redis-cli FLUSHALL > /dev/null

echo "=== 10 requests: cache MISS (1st) vs HIT (rest) ==="
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "Request $i: %{time_total}s\n" http://localhost:8000/api/products/
done
```

Expected: request 1 is slower (DB query), requests 2-10 are faster (cache hit).

```
Request 1: 0.024s   ← MariaDB
Request 2: 0.007s   ← Redis
Request 3: 0.006s   ← Redis
...
```

#### Redis memory usage

```bash
docker exec redis redis-cli INFO memory | grep used_memory_human
# used_memory_human:1.20M

docker exec redis redis-cli DBSIZE
# 1  (number of cached keys)
```
