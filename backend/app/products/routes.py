from flask import jsonify, request

from app import cache, db
from app.middleware import token_required
from app.models import Product
from app.products import bp
from app.products import logger

def _invalidate_product_cache():
    cache.delete("products:list")
    cache.delete("products:categories")

@bp.route("/", methods=["GET"])
@cache.cached(key_prefix="products:list")
def index():
    logger.debug("Listing all products.")
    products = Product.query.all()
    return jsonify([p.to_list_dict() for p in products])


@bp.route("/<product_id>/info", methods=["GET"])
def get_product(product_id):
    logger.debug(f"Retrieving product details for product_id: {product_id}")
    cache_key = f"products:detail:{product_id}"
    cached = cache.get(cache_key)
    if cached:
        return jsonify(cached)
    product = db.session.get(Product, product_id)
    if product:
        data = product.to_detail_dict()
        cache.set(cache_key, data)
        return jsonify(data)
    return jsonify({"error": "Product not found"}), 404


@bp.route("/categories/", methods=["GET"])
@cache.cached(key_prefix="products:categories")
def categories():
    logger.debug("Listing all product categories.")
    rows = db.session.query(Product.category).distinct().all()
    return jsonify([r[0] for r in rows])


@bp.route("/search", methods=["GET"])
def search():
    logger.debug("Searching products.")
    query = request.args.get("q")
    if not query:
        logger.error("No search query provided.")
        return jsonify({"error": "Query parameter 'q' is required"}), 400
    pattern = f"%{query}%"
    results = Product.query.filter(
        db.or_(
            Product.name.ilike(pattern),
            Product.category.ilike(pattern),
        )
    ).all()
    return jsonify([p.to_list_dict() for p in results])


@bp.route("/", methods=["POST"])
@token_required
def add():
    logger.debug("Adding new product.")
    data = request.get_json()
    if not data:
        logger.error("No JSON data provided in the request body.")
        return jsonify({"error": "Request body is required"}), 400
    required = ["id", "name", "price", "category"]
    missing = [f for f in required if f not in data]
    if missing:
        logger.error(f"Missing fields: {', '.join(missing)}")
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if db.session.get(Product, data["id"]):
        logger.error(f"Product with id {data['id']} already exists.")
        return jsonify({"error": "Product with this id already exists"}), 409
    product = Product(
        id=data["id"], name=data["name"], price=data["price"],
        category=data["category"], brand=data.get("brand"),
        made_in=data.get("made_in"), material=data.get("material"),
        color=data.get("color"), detail=data.get("detail"),
    )
    logger.debug(f"Adding new product: {data['id']} - {data['name']}")
    db.session.add(product)                     # 1. Stage the new product in SQLAlchemy's session (not yet in DB)
    db.session.commit()                         # 2. Write to MariaDB (INSERT INTO products ...)
    _invalidate_product_cache()                 # 3. Delete "products:list" and "products:categories" from Redis

    return jsonify({"message": "Product added", "id": data["id"]}), 201


@bp.route("/<product_id>", methods=["PUT"])
@token_required
def update(product_id):
    logger.debug(f"Updating product with id: {product_id}")
    product = db.session.get(Product, product_id)
    if not product:
        logger.error(f"Product with id {product_id} not found.")
        return jsonify({"error": "Product not found"}), 404
    data = request.get_json()
    for field in ["name", "price", "category", "brand", "made_in", "material", "color", "detail"]:
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product updated"})


@bp.route("/<product_id>", methods=["DELETE"])
@token_required
def delete(product_id):
    logger.debug(f"Deleting product with id: {product_id}")
    product = db.session.get(Product, product_id)
    if not product:
        logger.error(f"Product with id {product_id} not found.")
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product removed"})
