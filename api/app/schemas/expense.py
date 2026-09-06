from typing import Optional, List, Any
from pydantic import Field
from app.schemas.base import CamelModel

class PaymentLogSchema(CamelModel):
    id: str
    amount: float
    paid_by: str
    date: str
    payment_method: str
    notes: Optional[str] = None

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
    added_by: Optional[str] = None
    paid_by: Optional[str] = None
    vendor_name: Optional[str] = None
    product_name: Optional[str] = None
    payment_type: Optional[str] = None
    actual_amount: Optional[float] = Field(None, ge=0)
    amount_paid: Optional[float] = Field(None, ge=0)
    remaining_amount: Optional[float] = Field(None, ge=0)
    payment_logs: Optional[List[Any]] = None

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
    added_by: Optional[str] = None
    paid_by: Optional[str] = None
    vendor_name: Optional[str] = None
    product_name: Optional[str] = None
    payment_type: Optional[str] = None
    actual_amount: Optional[float] = Field(None, ge=0)
    amount_paid: Optional[float] = Field(None, ge=0)
    remaining_amount: Optional[float] = Field(None, ge=0)
    payment_logs: Optional[List[Any]] = None

class ExpenseResponse(ExpenseBase):
    id: str

