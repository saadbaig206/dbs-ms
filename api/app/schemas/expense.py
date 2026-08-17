from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel

class ExpenseBase(CamelModel):
    title: str
    category: str
    amount: float = Field(ge=0)
    date: str
    status: str = "Pending"
    payment_method: str
    notes: Optional[str] = None
    staff_id: Optional[str] = None
    branch_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(CamelModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    date: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    staff_id: Optional[str] = None
    branch_id: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: str
