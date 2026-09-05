import pytest

from app import create_app, db as _db
from app.models import Product


@pytest.fixture
def app():
    app = create_app(testing=True)
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def seed_products(app):
    products = [
        Product(
            id="yen-doi-triump-speed-400",
            name="Yen doi TRIUMP SPEED 400",
            price=197,
            category="Yen",
            brand="Triumph",
            made_in="Anh",
            material="Da cao cap",
            color="Den",
            detail="Yen doi cho xe Triumph Speed 400",
        ),
        Product(
            id="po-akrapovic-r1",
            name="Po Akrapovic R1",
            price=358,
            category="Po xe",
            brand="Akrapovic",
            made_in="Slovenia",
            material="Titanium",
            color="Bac",
            detail="Po xe Akrapovic cho R1",
        ),
    ]
    with app.app_context():
        for p in products:
            _db.session.add(p)
        _db.session.commit()
    return products
