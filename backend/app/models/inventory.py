from sqlalchemy import Column, String, Integer, Float
from sqlalchemy.ext.hybrid import hybrid_property
from app.models.base import Base

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(String, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    min_stock = Column(Integer, nullable=False, default=10)
    supplier = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    last_restocked = Column(String, nullable=False) # YYYY-MM-DD

    @hybrid_property
    def status(self) -> str:
        if self.quantity == 0:
            return "Out of Stock"
        elif self.quantity <= self.min_stock:
            return "Low Stock"
        else:
            return "In Stock"
