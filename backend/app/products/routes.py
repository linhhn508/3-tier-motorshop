from flask import jsonify, request

from app import db, cache
from app.models import Product
from app.middleware import token_required
from app.products import bp


@bp.route("/", methods=["GET"])
@cache.cached(key_prefix="products:list")
def index():
    products = Product.query.all()
    return jsonify([p.to_list_dict() for p in products])


@bp.route("/<product_id>/info", methods=["GET"])
@cache.cached(key_prefix="products:detail:%s")
def get_product(product_id):
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
    rows = db.session.query(Product.category).distinct().all()
    return jsonify([r[0] for r in rows])


@bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q")
    if not query:
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
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    required = ["id", "name", "price", "category"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if db.session.get(Product, data["id"]):
        return jsonify({"error": "Product with this id already exists"}), 409
    product = Product(
        id=data["id"], name=data["name"], price=data["price"],
        category=data["category"], brand=data.get("brand"),
        made_in=data.get("made_in"), material=data.get("material"),
        color=data.get("color"), detail=data.get("detail"),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added", "id": data["id"]}), 201


@bp.route("/<product_id>", methods=["PUT"])
@token_required
def update(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    data = request.get_json()
    for field in ["name", "price", "category", "brand", "made_in", "material", "color", "detail"]:
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return jsonify({"message": "Product updated"})


@bp.route("/<product_id>", methods=["DELETE"])
@token_required
def delete(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product removed"})



def _invalidate_product_cache():
    cache.delete("products:list")
    cache.delete("products:categories")
    # Delete all detail keys by pattern — flask-caching doesn't support wildcard,
    # so delete the specific detail key when we know the product_id
    # For list/categories, clearing those two is sufficient since detail keys
    # expire naturally after TTL

# In add(), after db.session.commit():
    _invalidate_product_cache()
    return jsonify({"message": "Product added", "id": data["id"]}), 201

# In update(), after db.session.commit():
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product updated"})

# In delete(), after db.session.commit():
    _invalidate_product_cache()
    cache.delete(f"products:detail:{product_id}")
    return jsonify({"message": "Product removed"})
