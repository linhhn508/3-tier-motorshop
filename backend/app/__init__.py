import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from flask_caching import Cache

db = SQLAlchemy()

cache = Cache()

def create_app(testing=False):
    app = Flask(__name__)

    if testing:
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["CACHE_TYPE"] = "SimpleCache"
    else:
        user = os.environ.get("MARIADB_USER")
        password = os.environ.get("MARIADB_PASSWORD")
        host = os.environ.get("MARIADB_HOST", "mariadb")
        database = os.environ.get("MARIADB_DATABASE")
        app.config["SQLALCHEMY_DATABASE_URI"] = (
            f"mysql+pymysql://{user}:{password}@{host}:3306/{database}"
        )

    app.config["MINIO_ENDPOINT"] = os.environ.get("MINIO_ENDPOINT")
    app.config["MINIO_ROOT_USER"] = os.environ.get("MINIO_ROOT_USER")
    app.config["MINIO_ROOT_PASSWORD"] = os.environ.get("MINIO_ROOT_PASSWORD")

    app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET")
    app.config["ADMIN_USERNAME"] = os.environ.get("ADMIN_USERNAME")
    app.config["ADMIN_PASSWORD"] = os.environ.get("ADMIN_PASSWORD")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    CORS(app)

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    app.config["CACHE_TYPE"] = "RedisCache"
    app.config["CACHE_REDIS_URL"] = redis_url
    app.config["CACHE_DEFAULT_TIMEOUT"] = 300

    cache.init_app(app)
    db.init_app(app)

    from app.products import bp as products_bp
    app.register_blueprint(products_bp, url_prefix="/api/products")

    from app.contact import bp as contact_bp
    app.register_blueprint(contact_bp, url_prefix="/api/contacts")

    from app.feedback import bp as feedback_bp
    app.register_blueprint(feedback_bp, url_prefix="/api/feedback")

    from app.health import bp as health_bp
    app.register_blueprint(health_bp, url_prefix="/api/health")

    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from app.upload import bp as upload_bp
    app.register_blueprint(upload_bp, url_prefix="/api/upload")


    @app.errorhandler(404)
    def not_found_error(error):
        if request.accept_mimetypes.best_match(["text/html", "application/json"]) == "application/json":
            return jsonify({"error": "Not found"}), 404
        return "<h1>404 Not Found</h1>", 404

    return app
