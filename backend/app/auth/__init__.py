import logging

from flask import Blueprint

bp = Blueprint("auth", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.auth import routes as routes
