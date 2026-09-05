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
