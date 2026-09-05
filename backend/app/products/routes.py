from flask import jsonify

from app import db
from app.models import Product
from app.products import bp


@bp.route("/", methods=["GET"])
def index():
    products = Product.query.all()
    return jsonify([p.to_list_dict() for p in products])


@bp.route("/<product_id>/info", methods=["GET"])
def get_product(product_id):
    product = db.session.get(Product, product_id)
    if product:
        return jsonify(product.to_detail_dict())
    return jsonify({"error": "Product not found"}), 404


@bp.route("/categories/", methods=["GET"])
def categories():
    rows = db.session.query(Product.category).distinct().all()
    return jsonify([r[0] for r in rows])
