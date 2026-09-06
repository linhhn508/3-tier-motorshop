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
