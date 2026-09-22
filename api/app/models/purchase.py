from sqlalchemy import Column, String, Float, Integer, ForeignKey
from app.models.base import Base

class PurchaseBill(Base):
    __tablename__ = "purchase_bills"

    id = Column(String, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False, index=True)
    bill_number = Column(String, nullable=True)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    total_amount = Column(Float, nullable=False)
    amount_paid = Column(Float, nullable=False, default=0.0)
    remaining_due = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String, nullable=False, default="Bank Transfer")
    payment_status = Column(String, nullable=False, default="Paid") # Paid, Pending, Partial
    notes = Column(String, nullable=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    created_by = Column(String, nullable=True)


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(String, primary_key=True, index=True)
    purchase_id = Column(String, ForeignKey("purchase_bills.id"), nullable=False, index=True)
    vendor_name = Column(String, nullable=False, index=True)
    item_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, default="Products")
    unit_cost = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    total_cost = Column(Float, nullable=False)
    batch_number = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    branch_id = Column(String, nullable=True)
