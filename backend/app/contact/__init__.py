from flask import Blueprint
import logging

bp = Blueprint("contacts", __name__)
logger = logging.getLogger(f"app.{bp.name}")

from app.contact import routes as routes
