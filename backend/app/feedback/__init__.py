import logging

from flask import Blueprint

bp = Blueprint("feedback", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.feedback import routes as routes
