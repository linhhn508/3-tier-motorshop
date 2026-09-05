# 3-Tier Motor Shop: MariaDB + Flask + Docker Compose

## Overview

Add backend (Flask), database (MariaDB), and image storage (MinIO) tiers to the existing React frontend. All services orchestrated via Docker Compose. No auth for now.

## Architecture

4 Docker Compose services on a single bridge network:

| Service | Base Image | Port | Purpose |
|---------|-----------|------|---------|
| frontend | Node 24 → Nginx 1.27 | 8000:80 | SPA + reverse proxy |
| backend | Python 3.12 + Gunicorn | 5000:5000 | Flask REST API |
| mariadb | MariaDB 11 | internal | Relational database |
| minio | MinIO | internal | Product image storage |

Nginx routes: `/` → SPA, `/api/*` → backend:5000, `/images/*` → minio:9000/product-image/.

## Database Schema (MariaDB)

```sql
CREATE TABLE products (
    id          VARCHAR(100) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    price       INT NOT NULL,
    category    VARCHAR(100) NOT NULL,
    brand       VARCHAR(100),
    made_in     VARCHAR(100),
    material    VARCHAR(100),
    color       VARCHAR(100),
    detail      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contacts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    subject     VARCHAR(255),
    message     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL,
    category    VARCHAR(100),
    product_id  VARCHAR(100),
    suggestion  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
```

Seed: 9 Vietnamese motorcycle products from reference project, inserted via init.sql.

## Backend

- Flask app factory pattern with `create_app()`
- Flask-SQLAlchemy ORM, PyMySQL driver
- Connection: `mysql+pymysql://<user>:<pass>@mariadb:3306/motorshop`
- `uv` for dependency management, Gunicorn for serving
- Flask-CORS enabled

### API Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/products/` | List all products (id, name, price, category) |
| GET | `/api/products/categories/` | Distinct category list |
| GET | `/api/products/<id>/info` | Full product detail, 404 if not found |
| POST | `/api/contact/` | Validate + save contact submission |
| POST | `/api/feedback/` | Validate + save feedback submission |
| GET | `/api/health` | Returns `{"status": "healthy"}` |

### Validation Rules

**Contact:** name, email, message required and non-blank. Email regex validated.

**Feedback:** name, rating, comment required. Rating must be int 1-5. product_id optional, validated against products table if provided.

## MinIO

- Bucket: `product-image` with public anonymous read
- 9 product image directories, each with `thumbnail.png`
- Init script creates bucket, sets policy, copies images
- Images served at `http://minio:9000/product-image/<product-id>/thumbnail.png`

## Docker Compose

- Single bridge network
- Health checks on mariadb and minio gate backend startup
- Backend depends on mariadb + minio healthy
- Frontend depends on all services
- Environment variables via `.env` file

## Testing

- pytest with in-memory SQLite (swapped via test config)
- Tests: product list, categories, product detail + 404, contact validation, feedback validation, health check

## Deferred

- JWT authentication
- Admin CRUD endpoints (add/update/remove products)
- AWS SES for contact emails
- AWS deployment (ECS, RDS, S3, CloudFront)
