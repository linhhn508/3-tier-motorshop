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
        resp = client.get("/api/contacts")
        assert resp.status_code == 401

    def test_protected_endpoint_invalid_token(self, client):
        resp = client.get("/api/contacts", headers={
            "Authorization": "Bearer invalid-token"
        })
        assert resp.status_code == 401

    def test_protected_endpoint_valid_token(self, client):
        login = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123",
        })
        token = login.get_json()["token"]
        resp = client.get("/api/contacts", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
