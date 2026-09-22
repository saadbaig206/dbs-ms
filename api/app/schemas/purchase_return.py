from typing import List, Optional, Any
from pydantic import Field
from app.schemas.base import CamelModel

class ReturnItemInput(CamelModel):
    item_name: str
    quantity: int = Field(ge=1)
    unit_cost: float = Field(ge=0)
    batch_number: Optional[str] = None
    reason: Optional[str] = "Surplus / Near Expiry"

class PurchaseReturnCreate(CamelModel):
    vendor_name: str
    date: Optional[str] = None
    items: List[ReturnItemInput]
    settlement_type: str = "Deduct_From_Payable" # Deduct_From_Payable, Cash_Refund, Vendor_Credit_Note
    reason: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[str] = None

class PurchaseReturnResponse(CamelModel):
    id: str
    debit_note_number: str
    vendor_name: str
    branch_id: Optional[str] = None
    date: str
    items: List[Any]
    total_refund_amount: float
    settlement_type: str
    status: str
    reason: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None
