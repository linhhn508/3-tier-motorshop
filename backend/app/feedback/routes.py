from flask import jsonify, request

from app import db
from app.feedback import bp, logger
from app.middleware import token_required
from app.models import Feedback, Product


@bp.route("", methods=["GET"])
@token_required
def list_all_feedback():
    logger.debug("Listing all feedback.")
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return jsonify([{
        "id": f.id,
        "name": f.name,
        "rating": f.rating,
        "comment": f.comment,
        "product_id": f.product_id,
    } for f in feedbacks])


@bp.route("/<product_id>", methods=["GET"])
def get_feedback(product_id):
    logger.debug(f"Retrieving feedback for product_id: {product_id}")
    if not db.session.get(Product, product_id):
        logger.error(f"Product with id {product_id} not found.")
        return jsonify({"error": "Product not found"}), 404

    feedbacks = (
        Feedback.query
        .filter_by(product_id=product_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return jsonify([
        {"name": f.name, "rating": f.rating, "comment": f.comment}
        for f in feedbacks
    ])


@bp.route("", methods=["POST"])
def submit_feedback():
    logger.debug("Feedback submission received.")
    data = request.get_json(silent=True)
    if not data:
        logger.error("No JSON data provided in the request body.")
        return jsonify({"error": "Request body is required"}), 400

    required = ["name", "rating", "comment"]
    missing = [f for f in required if f not in data]
    if missing:
        logger.error(f"Missing fields: {', '.join(missing)}")
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if not isinstance(data["rating"], int) or not (1 <= data["rating"] <= 5):
        logger.error("Invalid rating provided.")
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    product_id = data.get("product_id")
    if product_id and not db.session.get(Product, product_id):
        logger.error(f"Product with id {product_id} not found.")
        return jsonify({"error": "Product not found"}), 404

    feedback = Feedback(
        name=data["name"],
        rating=data["rating"],
        comment=data["comment"],
        product_id=product_id,
    )
    db.session.add(feedback)
    db.session.commit()

    return jsonify({"message": "Feedback submitted"}), 201
