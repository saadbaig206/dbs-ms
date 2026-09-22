from sqlalchemy import Column, String, Float, Integer, JSON, ForeignKey
from app.models.base import Base

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, nullable=False, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True, index=True)
    client_name = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False) # subtotal
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    tax_percent = Column(Float, default=0.0)
    grand_total = Column(Float, nullable=False)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    time = Column(String, nullable=True) # hh:mm AM/PM
    payment_method = Column(String, nullable=False) # Cash, Card, Bank, Online
    status = Column(String, nullable=False, default="Paid") # Paid, Refunded, Pending, Partially Paid
    amount_paid = Column(Float, nullable=True)
    remaining_due = Column(Float, nullable=True, default=0.0)
    payment_status = Column(String, nullable=True, default="Paid") # Paid, Partially Paid, Unpaid
    payment_splits = Column(JSON, nullable=True) # list of [{method, amount}]
    package_id = Column(String, nullable=True) # linked package for session redemption
    items = Column(JSON, nullable=True) # list of line items [{name, price, quantity}]
    
    # Optional Card transaction details
    card_last_four = Column(String, nullable=True)
    card_type = Column(String, nullable=True)
    bank_txn_id = Column(String, nullable=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True, index=True)
    transaction_type = Column(String, nullable=False, default="Sale") # Sale, Debt_Settlement, Package_Redemption
    audit_logs = Column(JSON, nullable=True, default=list) # [{timestamp, updated_by, changes, reason}]
    reprint_count = Column(Integer, nullable=False, default=0)
    cash_received = Column(Float, nullable=True)
    cash_returned = Column(Float, nullable=True)
