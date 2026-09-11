from flask import Blueprint
import logging

bp = Blueprint("auth", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.auth import routes as routes
