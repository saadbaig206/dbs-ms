from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class PurchaseItemInput(CamelModel):
    item_name: str
    category: str = "Products"
    unit_cost: float = Field(ge=0)
    selling_price: Optional[float] = None
    quantity: int = Field(ge=1)
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None

class PurchaseCreate(CamelModel):
    vendor_name: str
    bill_number: Optional[str] = None
    date: str
    payment_method: str = "Bank Transfer"
    payment_status: str = "Paid" # Paid, Pending, Partial
    amount_paid: Optional[float] = None
    notes: Optional[str] = None
    branch_id: Optional[str] = None
    items: List[PurchaseItemInput]

class PurchaseItemResponse(CamelModel):
    id: str
    purchase_id: str
    vendor_name: str
    item_name: str
    category: str
    unit_cost: float
    quantity: int
    total_cost: float
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    date: str
    branch_id: Optional[str] = None

class PurchaseBillResponse(CamelModel):
    id: str
    vendor_name: str
    bill_number: Optional[str] = None
    date: str
    total_amount: float
    amount_paid: float
    remaining_due: float
    payment_method: str
    payment_status: str
    notes: Optional[str] = None
    branch_id: Optional[str] = None
    created_by: Optional[str] = None

class PurchasePaymentInput(CamelModel):
    amount: float = Field(gt=0)
    payment_method: str = "Bank Transfer"
    notes: Optional[str] = None
