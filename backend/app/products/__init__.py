from flask import Blueprint
import logging

bp = Blueprint("products", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.products import routes as routes
