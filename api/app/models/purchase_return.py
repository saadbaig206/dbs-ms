from sqlalchemy import Column, String, Float, JSON, ForeignKey
from app.models.base import Base

class PurchaseReturn(Base):
    __tablename__ = "purchase_returns"

    id = Column(String, primary_key=True, index=True)
    debit_note_number = Column(String, nullable=False, unique=True, index=True) # DN-2026-001
    vendor_name = Column(String, nullable=False, index=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    items = Column(JSON, nullable=False) # list of [{item_name, quantity, unit_cost, total_cost, batch_number, reason}]
    total_refund_amount = Column(Float, nullable=False)
    settlement_type = Column(String, nullable=False, default="Deduct_From_Payable") # Deduct_From_Payable, Cash_Refund, Vendor_Credit_Note
    status = Column(String, nullable=False, default="Completed")
    reason = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    notes = Column(String, nullable=True)
