class TestHealth:
    def test_health_check(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "healthy"


class TestProducts:
    def test_list_products(self, client, seed_products):
        resp = client.get("/api/products/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 2
        assert data[0]["id"] == "yen-doi-triump-speed-400"

    def test_list_products_empty(self, client):
        resp = client.get("/api/products/")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_get_product_detail(self, client, seed_products):
        resp = client.get("/api/products/po-akrapovic-r1/info")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == "po-akrapovic-r1"
        assert data["product"]["overall"]["brand"] == "Akrapovic"

    def test_get_product_not_found(self, client, seed_products):
        resp = client.get("/api/products/nonexistent/info")
        assert resp.status_code == 404

    def test_categories(self, client, seed_products):
        resp = client.get("/api/products/categories/")
        assert resp.status_code == 200
        cats = resp.get_json()
        assert set(cats) == {"Yen", "Po xe"}


class TestContact:
    def test_submit_contact(self, client):
        resp = client.post("/api/contacts", json={
            "name": "Test User",
            "email": "test@example.com",
            "message": "Hello",
        })
        assert resp.status_code == 200
        assert resp.get_json()["message"] == "Message sent"

    def test_submit_contact_missing_fields(self, client):
        resp = client.post("/api/contacts", json={"name": "Test"})
        assert resp.status_code == 400

    def test_submit_contact_invalid_email(self, client):
        resp = client.post("/api/contacts", json={
            "name": "Test",
            "email": "not-an-email",
            "message": "Hello",
        })
        assert resp.status_code == 400

    def test_submit_contact_no_body(self, client):
        resp = client.post("/api/contacts", content_type="application/json")
        assert resp.status_code == 400


class TestFeedback:
    def test_get_feedback_for_product(self, client, seed_products):
        client.post("/api/feedback", json={
            "name": "User A",
            "rating": 5,
            "comment": "Excellent",
            "product_id": "po-akrapovic-r1",
        })
        client.post("/api/feedback", json={
            "name": "User B",
            "rating": 3,
            "comment": "OK",
            "product_id": "po-akrapovic-r1",
        })
        resp = client.get("/api/feedback/po-akrapovic-r1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 2
        assert set(data[0].keys()) == {"name", "rating", "comment"}

    def test_get_feedback_empty(self, client, seed_products):
        resp = client.get("/api/feedback/po-akrapovic-r1")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_get_feedback_product_not_found(self, client):
        resp = client.get("/api/feedback/nonexistent")
        assert resp.status_code == 404

    def test_submit_feedback(self, client):
        resp = client.post("/api/feedback", json={
            "name": "Test User",
            "rating": 5,
            "comment": "Great product",
        })
        assert resp.status_code == 201
        assert resp.get_json()["message"] == "Feedback submitted"

    def test_submit_feedback_with_product(self, client, seed_products):
        resp = client.post("/api/feedback", json={
            "name": "Test",
            "rating": 4,
            "comment": "Good",
            "product_id": "po-akrapovic-r1",
        })
        assert resp.status_code == 201

    def test_submit_feedback_invalid_product(self, client):
        resp = client.post("/api/feedback", json={
            "name": "Test",
            "rating": 4,
            "comment": "Good",
            "product_id": "nonexistent",
        })
        assert resp.status_code == 404

    def test_submit_feedback_missing_fields(self, client):
        resp = client.post("/api/feedback", json={"name": "Test"})
        assert resp.status_code == 400

    def test_submit_feedback_invalid_rating(self, client):
        resp = client.post("/api/feedback", json={
            "name": "Test",
            "rating": 6,
            "comment": "Bad rating",
        })
        assert resp.status_code == 400

    def test_submit_feedback_no_body(self, client):
        resp = client.post("/api/feedback", content_type="application/json")
        assert resp.status_code == 400
