import logging

from flask import Blueprint

bp = Blueprint("upload", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.upload import routes as routes
