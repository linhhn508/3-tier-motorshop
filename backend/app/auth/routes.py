from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app, jsonify, request

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
