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
        token = jwt.encode({"sub": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")
        client.post("/api/products/", json={
            "id": "new-prod", "name": "New", "price": 100, "category": "Test"
        }, headers={"Authorization": f"Bearer {token}"})

        assert cache.get("products:list") is None

    def test_delete_product_invalidates_cache(self, client, seed_products):
        client.get("/api/products/")
        client.get("/api/products/po-akrapovic-r1/info")
        assert cache.get("products:list") is not None

        import jwt, os
        token = jwt.encode({"sub": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")
        client.delete("/api/products/po-akrapovic-r1",
                       headers={"Authorization": f"Bearer {token}"})

        assert cache.get("products:list") is None
        assert cache.get("products:detail:po-akrapovic-r1") is None
