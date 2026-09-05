import logging
import re

from flask import jsonify, request

from app import db
from app.models import Contact
from app.contact import bp

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


@bp.route("", methods=["POST"])
def submit_contact():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required = ["name", "email", "message"]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if not EMAIL_REGEX.match(data["email"]):
        return jsonify({"error": "Invalid email format"}), 400

    contact = Contact(
        name=data["name"].strip(),
        email=data["email"].strip(),
        phone=data.get("phone", "").strip() or None,
        subject=data.get("subject", "").strip() or None,
        message=data["message"].strip(),
    )
    db.session.add(contact)
    db.session.commit()

    logger.info("Contact saved: name=%s email=%s", data["name"], data["email"])
    return jsonify({"message": "Message sent"}), 200
