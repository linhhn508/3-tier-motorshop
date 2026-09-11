from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app, jsonify, request

from app.auth import bp
from app.products import logger


@bp.route("/login", methods=["POST"])
def login():
    logger.debug("Login attempt received.")
    data = request.get_json(silent=True)
    if not data:
        logger.error("No JSON data provided in the request body.")
        return jsonify({"error": "Request body is required"}), 400

    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        logger.error("Username or password not provided in the request body.")
        return jsonify({"error": "Username and password required"}), 400

    if (username != current_app.config["ADMIN_USERNAME"] or
            password != current_app.config["ADMIN_PASSWORD"]):
        logger.error(f"Invalid login attempt for username: {username}")
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"sub": username, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        current_app.config["JWT_SECRET"],
        algorithm="HS256",
    )
    logger.debug(f"User {username} logged in successfully. Token generated.")
    return jsonify({"token": token})
