import logging
import re

from flask import jsonify, request

from app import db
from app.contact import bp
from app.middleware import token_required
from app.models import Contact
from app.products import logger

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

@bp.route("", methods=["GET"])
@token_required
def list_contacts():
    logger.debug("Listing contacts.")
    contacts = Contact.query.order_by(Contact.created_at.desc()).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "subject": c.subject,
        "message": c.message,
    } for c in contacts])


@bp.route("", methods=["POST"])
def submit_contact():
    logger.debug("Contact submission received.")
    data = request.get_json()
    if not data:
        logger.error("No JSON data provided in the request body.")
        return jsonify({"error": "Request body is required"}), 400

    required = ["name", "email", "message"]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        logger.error(f"Missing fields: {', '.join(missing)}")
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if not EMAIL_REGEX.match(data["email"]):
        logger.error("Invalid email format provided.")
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

    logger.debug("Contact saved: name=%s email=%s", data["name"], data["email"])
    return jsonify({"message": "Message sent"}), 200
