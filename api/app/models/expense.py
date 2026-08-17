from sqlalchemy import Column, String, Float, ForeignKey
from app.models.base import Base

class ExpenseItem(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False) # Salary, Electric Bill, Rent, etc.
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    status = Column(String, nullable=False, default="Pending") # Paid, Pending
    payment_method = Column(String, nullable=False) # Bank Transfer, Cash, Card, Cheque
    notes = Column(String, nullable=True)
    staff_id = Column(String, nullable=True) # Linked staff member for salary
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
