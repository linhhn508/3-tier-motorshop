from flask import Blueprint

bp = Blueprint("contacts", __name__)

from app.contact import routes
