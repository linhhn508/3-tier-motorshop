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
