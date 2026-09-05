# Phase 1: JWT Auth, Admin CRUD, Search, Image Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT authentication, a React admin dashboard with product CRUD + image upload, server-side search, and contact/feedback listing endpoints.

**Architecture:** Flask backend gets auth middleware, new blueprints (auth, upload), and CRUD endpoints on existing blueprints. React frontend gets /admin/login and /admin routes with a tabbed dashboard. Image upload uses MinIO pre-signed URLs via boto3.

**Tech Stack:** Flask, SQLAlchemy, PyJWT, boto3, React, React Router

**Spec:** docs/superpowers/specs/2026-09-05-expanded-architecture-design.md (Phase 1 section)

## Global Constraints

- Python >= 3.12, uv for dependency management
- React 19 + React Router 7 + Vite 6
- JWT HS256, 1-hour expiry
- All backend tests use in-memory SQLite via create_app(testing=True)
- Frontend tests use vitest + @testing-library/react + msw
- WSL environment: use terminal commands (cat >) for file creation
- Commit after each task

---

### Task 1: JWT Auth Backend (middleware + login endpoint)

**Files:**
- Create: `backend/app/middleware.py`
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/routes.py`
- Modify: `backend/app/__init__.py` (register auth blueprint, add config)
- Modify: `backend/pyproject.toml` (add PyJWT)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: nothing (standalone)
- Produces: `@token_required` decorator (wraps Flask route, returns 401 if no valid Bearer token); `POST /api/auth/login` returns `{"token": "<jwt>"}` on success, 401 on bad credentials

- [ ] **Step 1: Add PyJWT dependency**

Add to pyproject.toml dependencies:
```
"PyJWT>=2.9.0",
```
Run: `cd backend && uv sync`

- [ ] **Step 2: Write auth tests**

Create `backend/tests/test_auth.py`:
```python
import jwt

class TestAuth:
    def test_login_success(self, client):
        resp = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "token" in data
        decoded = jwt.decode(data["token"], "test-secret-key", algorithms=["HS256"])
        assert decoded["sub"] == "admin"

    def test_login_wrong_password(self, client):
        resp = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "wrong",
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 400

    def test_login_no_body(self, client):
        resp = client.post("/api/auth/login", content_type="application/json")
        assert resp.status_code == 400

    def test_protected_endpoint_no_token(self, client):
        resp = client.get("/api/contacts/")
        assert resp.status_code == 401

    def test_protected_endpoint_invalid_token(self, client):
        resp = client.get("/api/contacts/", headers={
            "Authorization": "Bearer invalid-token"
        })
        assert resp.status_code == 401

    def test_protected_endpoint_valid_token(self, client):
        login = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123",
        })
        token = login.get_json()["token"]
        resp = client.get("/api/contacts/", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_auth.py -v`
Expected: FAIL (modules not found)

- [ ] **Step 4: Update conftest.py with auth env vars**

Add to conftest.py app fixture, inside create_app(testing=True) block — set env vars before create_app:
```python
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")
```

- [ ] **Step 5: Create middleware.py**

Create `backend/app/middleware.py`:
```python
from functools import wraps
from flask import request, jsonify, current_app
import jwt


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
            request.user = payload["sub"]
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated
```

- [ ] **Step 6: Create auth blueprint**

Create `backend/app/auth/__init__.py`:
```python
from flask import Blueprint

bp = Blueprint("auth", __name__)

from app.auth import routes
```

Create `backend/app/auth/routes.py`:
```python
from datetime import datetime, timedelta, timezone
from flask import jsonify, request, current_app
import jwt
from app.auth import bp


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if (username != current_app.config["ADMIN_USERNAME"] or
            password != current_app.config["ADMIN_PASSWORD"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"sub": username, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        current_app.config["JWT_SECRET"],
        algorithm="HS256",
    )
    return jsonify({"token": token})
```

- [ ] **Step 7: Update app/__init__.py**

Add to create_app():
- Config: `app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET", "changeme")`
- Config: `app.config["ADMIN_USERNAME"] = os.environ.get("ADMIN_USERNAME", "admin")`
- Config: `app.config["ADMIN_PASSWORD"] = os.environ.get("ADMIN_PASSWORD", "admin123")`
- Register blueprint: `from app.auth import bp as auth_bp` and `app.register_blueprint(auth_bp, url_prefix="/api/auth")`

- [ ] **Step 8: Add GET /api/contacts/ protected endpoint**

Add to `backend/app/contact/routes.py`:
```python
from app.middleware import token_required
from app.models import Contact

@bp.route("", methods=["GET"])
@token_required
def list_contacts():
    contacts = Contact.query.order_by(Contact.created_at.desc()).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "subject": c.subject,
        "message": c.message,
    } for c in contacts])
```

- [ ] **Step 9: Run all tests**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS (including new auth tests)

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add JWT auth middleware and login endpoint"
```

---

### Task 2: Product CRUD + Search Backend Endpoints

**Files:**
- Modify: `backend/app/products/routes.py` (add search, add, update, delete)
- Test: `backend/tests/test_products_crud.py`

**Interfaces:**
- Consumes: `@token_required` from Task 1
- Produces: `POST /api/products/` (JWT), `PUT /api/products/<id>` (JWT), `DELETE /api/products/<id>` (JWT), `GET /api/products/search?q=` (public)

- [ ] **Step 1: Write CRUD + search tests**

Create `backend/tests/test_products_crud.py`:
```python
class TestProductSearch:
    def test_search_by_name(self, client, seed_products):
        resp = client.get("/api/products/search?q=Akrapovic")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 1
        assert data[0]["id"] == "po-akrapovic-r1"

    def test_search_by_category(self, client, seed_products):
        resp = client.get("/api/products/search?q=Yen")
        assert resp.status_code == 200
        assert len(resp.get_json()) == 1

    def test_search_no_results(self, client, seed_products):
        resp = client.get("/api/products/search?q=nonexistent")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_search_missing_query(self, client):
        resp = client.get("/api/products/search")
        assert resp.status_code == 400


class TestProductCRUD:
    def _get_token(self, client):
        resp = client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123",
        })
        return resp.get_json()["token"]

    def test_add_product(self, client):
        token = self._get_token(client)
        resp = client.post("/api/products/", json={
            "id": "test-product",
            "name": "Test Product",
            "price": 100,
            "category": "Test",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 201

    def test_add_product_duplicate(self, client, seed_products):
        token = self._get_token(client)
        resp = client.post("/api/products/", json={
            "id": "po-akrapovic-r1",
            "name": "Duplicate",
            "price": 100,
            "category": "Test",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 409

    def test_add_product_missing_fields(self, client):
        token = self._get_token(client)
        resp = client.post("/api/products/", json={
            "name": "No ID",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 400

    def test_add_product_no_auth(self, client):
        resp = client.post("/api/products/", json={
            "id": "test", "name": "Test", "price": 100, "category": "Test",
        })
        assert resp.status_code == 401

    def test_update_product(self, client, seed_products):
        token = self._get_token(client)
        resp = client.put("/api/products/po-akrapovic-r1", json={
            "price": 999,
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        detail = client.get("/api/products/po-akrapovic-r1/info")
        assert detail.get_json()["price"] == 999

    def test_update_product_not_found(self, client):
        token = self._get_token(client)
        resp = client.put("/api/products/nonexistent", json={
            "price": 100,
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404

    def test_delete_product(self, client, seed_products):
        token = self._get_token(client)
        resp = client.delete("/api/products/po-akrapovic-r1",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        detail = client.get("/api/products/po-akrapovic-r1/info")
        assert detail.status_code == 404

    def test_delete_product_not_found(self, client):
        token = self._get_token(client)
        resp = client.delete("/api/products/nonexistent",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_products_crud.py -v`
Expected: FAIL

- [ ] **Step 3: Implement search + CRUD endpoints**

Add to `backend/app/products/routes.py`:
```python
from flask import request
from app.middleware import token_required

@bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400
    pattern = f"%{query}%"
    results = Product.query.filter(
        db.or_(
            Product.name.ilike(pattern),
            Product.category.ilike(pattern),
        )
    ).all()
    return jsonify([p.to_list_dict() for p in results])


@bp.route("/", methods=["POST"])
@token_required
def add():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    required = ["id", "name", "price", "category"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if db.session.get(Product, data["id"]):
        return jsonify({"error": "Product with this id already exists"}), 409
    product = Product(
        id=data["id"], name=data["name"], price=data["price"],
        category=data["category"], brand=data.get("brand"),
        made_in=data.get("made_in"), material=data.get("material"),
        color=data.get("color"), detail=data.get("detail"),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added", "id": data["id"]}), 201


@bp.route("/<product_id>", methods=["PUT"])
@token_required
def update(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    data = request.get_json()
    for field in ["name", "price", "category", "brand", "made_in", "material", "color", "detail"]:
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return jsonify({"message": "Product updated"})


@bp.route("/<product_id>", methods=["DELETE"])
@token_required
def delete(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product removed"})
```

- [ ] **Step 4: Run all tests**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add product CRUD and search endpoints"
```

---

### Task 3: Image Upload Pre-signed URL Endpoint

**Files:**
- Create: `backend/app/upload/__init__.py`
- Create: `backend/app/upload/routes.py`
- Modify: `backend/app/__init__.py` (register upload blueprint, add MinIO config)
- Modify: `backend/pyproject.toml` (add boto3)
- Test: `backend/tests/test_upload.py`

**Interfaces:**
- Consumes: `@token_required` from Task 1
- Produces: `GET /api/upload/presign?filename=<path>` returns `{"url": "<presigned-put-url>"}` (JWT required)

- [ ] **Step 1: Add boto3 dependency**

Add to pyproject.toml dependencies:
```
"boto3>=1.35.0",
```
Run: `cd backend && uv sync`

- [ ] **Step 2: Write upload tests**

Create `backend/tests/test_upload.py`:
```python
from unittest.mock import patch, MagicMock


class TestUpload:
    def _get_token(self, client):
        resp = client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123",
        })
        return resp.get_json()["token"]

    @patch("app.upload.routes.get_s3_client")
    def test_presign_success(self, mock_get_client, client):
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = "http://minio:9000/presigned"
        mock_get_client.return_value = mock_client
        token = self._get_token(client)
        resp = client.get("/api/upload/presign?filename=test/thumbnail.png",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "url" in resp.get_json()

    def test_presign_no_auth(self, client):
        resp = client.get("/api/upload/presign?filename=test/thumbnail.png")
        assert resp.status_code == 401

    def test_presign_missing_filename(self, client):
        token = self._get_token(client)
        resp = client.get("/api/upload/presign",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 400
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_upload.py -v`
Expected: FAIL

- [ ] **Step 4: Create upload blueprint**

Create `backend/app/upload/__init__.py`:
```python
from flask import Blueprint

bp = Blueprint("upload", __name__)

from app.upload import routes
```

Create `backend/app/upload/routes.py`:
```python
import boto3
from flask import current_app, jsonify, request
from app.middleware import token_required
from app.upload import bp


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"http://{current_app.config['MINIO_ENDPOINT']}",
        aws_access_key_id=current_app.config["MINIO_ROOT_USER"],
        aws_secret_access_key=current_app.config["MINIO_ROOT_PASSWORD"],
    )


@bp.route("/presign", methods=["GET"])
@token_required
def presign():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "filename parameter is required"}), 400

    client = get_s3_client()
    url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": "product-image", "Key": filename},
        ExpiresIn=300,
    )
    return jsonify({"url": url})
```

- [ ] **Step 5: Update app/__init__.py**

Add MinIO config to create_app():
```python
app.config["MINIO_ENDPOINT"] = os.environ.get("MINIO_ENDPOINT", "minio:9000")
app.config["MINIO_ROOT_USER"] = os.environ.get("MINIO_ROOT_USER", "minioadmin")
app.config["MINIO_ROOT_PASSWORD"] = os.environ.get("MINIO_ROOT_PASSWORD", "password123")
```

Register blueprint:
```python
from app.upload import bp as upload_bp
app.register_blueprint(upload_bp, url_prefix="/api/upload")
```

- [ ] **Step 6: Run all tests**

Run: `cd backend && uv run pytest -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add MinIO pre-signed URL upload endpoint"
```

---

### Task 4: Update .env and docker-compose.yml for Phase 1

**Files:**
- Modify: `.env` (add JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, MINIO_ENDPOINT)
- Modify: `docker-compose.yml` (add new env vars to backend service)

**Interfaces:**
- Consumes: env var names from Tasks 1-3
- Produces: working Docker environment with all Phase 1 backend features

- [ ] **Step 1: Update .env**

Append to `.env`:
```
JWT_SECRET=supersecretkey123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
MINIO_ENDPOINT=minio:9000
```

- [ ] **Step 2: Update docker-compose.yml backend environment**

Add to backend service environment list:
```yaml
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
```

- [ ] **Step 3: Test docker compose build**

Run: `docker compose build backend`
Expected: builds successfully

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Phase 1 env vars to docker-compose"
```

---

### Task 5: Admin Login Page (React)

**Files:**
- Create: `frontend/src/pages/AdminLoginPage.jsx`
- Modify: `frontend/src/App.jsx` (add /admin/login route)
- Test: `frontend/src/pages/__tests__/AdminLoginPage.test.jsx`

**Interfaces:**
- Consumes: `POST /api/auth/login` from Task 1
- Produces: AdminLoginPage component, stores JWT in localStorage, navigates to /admin on success

- [ ] **Step 1: Create MSW handler for auth**

Add to `frontend/tests/mocks/handlers.js`:
```javascript
http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    if (body.username === 'admin' && body.password === 'admin123') {
        return HttpResponse.json({ token: 'mock-jwt-token' })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}),
```

- [ ] **Step 2: Write AdminLoginPage test**

Create `frontend/src/pages/__tests__/AdminLoginPage.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminLoginPage from '../AdminLoginPage'

function renderLoginPage() {
  return render(<MemoryRouter><AdminLoginPage /></MemoryRouter>)
}

describe('AdminLoginPage', () => {
  it('renders login form', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText(/username/i), 'wrong')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/invalid/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/__tests__/AdminLoginPage.test.jsx`
Expected: FAIL

- [ ] **Step 4: Implement AdminLoginPage**

Create `frontend/src/pages/AdminLoginPage.jsx`:
```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/pages.css'

function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (resp.ok) {
        const data = await resp.json()
        localStorage.setItem('admin_token', data.token)
        navigate('/admin')
      } else {
        setError('Invalid credentials')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="page-header">
        <h2>Admin Login</h2>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="admin-user">Username</label>
          <input type="text" id="admin-user" value={username}
            onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="admin-pass">Password</label>
          <input type="password" id="admin-pass" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="form-status error" role="alert">{error}</div>}
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage
```

- [ ] **Step 5: Add route to App.jsx**

Add import and route:
```jsx
import AdminLoginPage from './pages/AdminLoginPage'
// inside Routes:
<Route path="/admin/login" element={<AdminLoginPage />} />
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add admin login page"
```

---

### Task 6: Admin Dashboard Page (React)

**Files:**
- Create: `frontend/src/pages/AdminPage.jsx`
- Modify: `frontend/src/App.jsx` (add /admin route)
- Test: `frontend/src/pages/__tests__/AdminPage.test.jsx`

**Interfaces:**
- Consumes: `GET /api/products/`, `POST /api/products/`, `PUT /api/products/<id>`, `DELETE /api/products/<id>`, `GET /api/contacts/`, `GET /api/feedback/<product_id>`, `GET /api/upload/presign?filename=` — all from Tasks 1-3
- Produces: AdminPage component with Products/Contacts/Feedback tabs, product CRUD with image upload

- [ ] **Step 1: Add MSW handlers for admin endpoints**

Add to `frontend/tests/mocks/handlers.js`:
```javascript
http.get('/api/contacts/', () => {
    return HttpResponse.json([
        { id: 1, name: 'Test User', email: 'test@test.com', phone: '123', subject: 'Hi', message: 'Hello' },
    ])
}),

http.post('/api/products/', async () => {
    return HttpResponse.json({ message: 'Product added', id: 'new-product' }, { status: 201 })
}),

http.put('/api/products/:id', async () => {
    return HttpResponse.json({ message: 'Product updated' })
}),

http.delete('/api/products/:id', async () => {
    return HttpResponse.json({ message: 'Product removed' })
}),

http.get('/api/upload/presign', () => {
    return HttpResponse.json({ url: 'http://minio:9000/presigned-url' })
}),
```

- [ ] **Step 2: Write AdminPage test**

Create `frontend/src/pages/__tests__/AdminPage.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from '../AdminPage'

beforeEach(() => {
  localStorage.setItem('admin_token', 'mock-jwt-token')
})
afterEach(() => {
  localStorage.removeItem('admin_token')
})

function renderAdminPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>)
}

describe('AdminPage', () => {
  it('renders admin dashboard with tabs', () => {
    renderAdminPage()
    expect(screen.getByText(/products/i)).toBeInTheDocument()
    expect(screen.getByText(/contacts/i)).toBeInTheDocument()
    expect(screen.getByText(/feedback/i)).toBeInTheDocument()
  })

  it('shows product list by default', async () => {
    renderAdminPage()
    expect(await screen.findByText('Lop Michelin City Grip 2')).toBeInTheDocument()
  })

  it('switches to contacts tab', async () => {
    const user = userEvent.setup()
    renderAdminPage()
    await user.click(screen.getByRole('button', { name: /contacts/i }))
    expect(await screen.findByText('test@test.com')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/__tests__/AdminPage.test.jsx`
Expected: FAIL

- [ ] **Step 4: Implement AdminPage**

Create `frontend/src/pages/AdminPage.jsx` — a dashboard component with:
- Token check: if no `admin_token` in localStorage, redirect to /admin/login
- Three tabs: Products (default), Contacts, Feedback
- Products tab: table with add/edit/delete, image upload via pre-signed URL
- Contacts tab: read-only table
- Feedback tab: read-only table
- All API calls include `Authorization: Bearer <token>` header
- Style using existing CSS classes from pages.css + admin-specific styles

(This is a large component — use the ui-ux-pro-max skill for styling when implementing)

- [ ] **Step 5: Add route to App.jsx**

Add import and route:
```jsx
import AdminPage from './pages/AdminPage'
// inside Routes:
<Route path="/admin" element={<AdminPage />} />
```

- [ ] **Step 6: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add admin dashboard page with CRUD"
```

---

### Task 7: Server-Side Search in Frontend

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx` (switch to server-side search)
- Modify: `frontend/tests/mocks/handlers.js` (add search handler)
- Test: `frontend/src/pages/__tests__/HomePage.test.jsx` (update search test if needed)

**Interfaces:**
- Consumes: `GET /api/products/search?q=` from Task 2
- Produces: HomePage uses server-side search when `?q=` param exists

- [ ] **Step 1: Add MSW handler for search**

Add to `frontend/tests/mocks/handlers.js`:
```javascript
http.get('/api/products/search', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase() || ''
    const filtered = mockProducts.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    )
    return HttpResponse.json(filtered)
}),
```

- [ ] **Step 2: Update HomePage to use server-side search**

In `frontend/src/pages/HomePage.jsx`, when `searchQuery` is set:
- Fetch from `/api/products/search?q=<query>` instead of filtering client-side
- Keep client-side category filtering (categories are a small fixed set)

- [ ] **Step 3: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: switch to server-side search"
```

---

### Task 8: Integration Test — Docker Compose Up

**Files:** None (verification only)

- [ ] **Step 1: Build and start all services**

```bash
cd /home/hoi9hc/3-tier-motorshop
docker compose up --build -d
```

- [ ] **Step 2: Test API endpoints**

```bash
# Health
curl -s http://localhost:5000/api/health
# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
# Search
curl -s "http://localhost:5000/api/products/search?q=Michelin"
# Add product (JWT)
curl -s -X POST http://localhost:5000/api/products/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"id":"test-integration","name":"Test","price":100,"category":"Test"}'
# Delete product (JWT)
curl -s -X DELETE http://localhost:5000/api/products/test-integration \
  -H "Authorization: Bearer $TOKEN"
# Contacts list (JWT)
curl -s http://localhost:5000/api/contacts/ \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 3: Test frontend at http://localhost:8000**

Verify admin login at /admin/login and dashboard at /admin.

- [ ] **Step 4: Commit if any fixes needed**
