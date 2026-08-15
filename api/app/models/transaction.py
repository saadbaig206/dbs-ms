from sqlalchemy import Column, String, Float, JSON
from app.models.base import Base

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False) # subtotal
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    tax_percent = Column(Float, default=0.0)
    grand_total = Column(Float, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    payment_method = Column(String, nullable=False) # Cash, Card, Bank, Online
    status = Column(String, nullable=False, default="Paid") # Paid, Refunded, Pending
    items = Column(JSON, nullable=True) # list of line items [{name, price, quantity}]
    
    # Optional Card transaction details
    card_last_four = Column(String, nullable=True)
    card_type = Column(String, nullable=True)
    bank_txn_id = Column(String, nullable=True)
