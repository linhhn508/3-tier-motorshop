from app import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(100))
    made_in = db.Column(db.String(100))
    material = db.Column(db.String(100))
    color = db.Column(db.String(100))
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    feedback = db.relationship("Feedback", backref="product", lazy=True)

    def to_list_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "category": self.category,
        }

    def to_detail_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "category": self.category,
            "product": {
                "overall": {
                    "brand": self.brand,
                    "made_in": self.made_in,
                    "material": self.material,
                    "color": self.color,
                },
                "detail": self.detail,
            },
        }


class Contact(db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50))
    subject = db.Column(db.String(255))
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())


class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    product_id = db.Column(db.String(100), db.ForeignKey("products.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
