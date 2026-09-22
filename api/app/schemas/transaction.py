from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class InvoiceLineItemSchema(CamelModel):
    name: str
    price: float = Field(ge=0)
    quantity: int = Field(ge=1)

class FinancialTransactionBase(CamelModel):
    invoice_id: str
    client_id: Optional[str] = None
    client_name: str
    service_name: str
    amount: float = Field(ge=0)
    discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0)
    grand_total: float = Field(ge=0)
    date: str
    time: Optional[str] = None
    payment_method: str
    status: str = "Paid"
    amount_paid: Optional[float] = None
    remaining_due: Optional[float] = 0.0
    payment_status: Optional[str] = "Paid"
    payment_splits: Optional[List[dict]] = None
    package_id: Optional[str] = None
    items: Optional[List[InvoiceLineItemSchema]] = None
    card_last_four: Optional[str] = None
    card_type: Optional[str] = None
    bank_txn_id: Optional[str] = None
    branch_id: Optional[str] = None
    transaction_type: Optional[str] = "Sale"
    audit_logs: Optional[List[dict]] = None
    reprint_count: Optional[int] = 0
    cash_received: Optional[float] = None
    cash_returned: Optional[float] = None


class FinancialTransactionCreate(CamelModel):
    client_name: str
    payment_method: str
    discount_percent: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0)
    branch_id: Optional[str] = None
    cash_received: Optional[float] = None
    cash_returned: Optional[float] = None

class FinancialTransactionResponse(FinancialTransactionBase):
    id: str

class FinancialTransactionUpdate(CamelModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    service_name: Optional[str] = None
    amount: Optional[float] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    tax_percent: Optional[float] = None
    grand_total: Optional[float] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    amount_paid: Optional[float] = None
    remaining_due: Optional[float] = None
    payment_status: Optional[str] = None
    payment_splits: Optional[List[dict]] = None
    package_id: Optional[str] = None
    items: Optional[List[InvoiceLineItemSchema]] = None
    transaction_type: Optional[str] = None
    update_reason: Optional[str] = None
    reprint_count: Optional[int] = None
    cash_received: Optional[float] = None
    cash_returned: Optional[float] = None

    card_last_four: Optional[str] = None
    card_type: Optional[str] = None
    bank_txn_id: Optional[str] = None
    branch_id: Optional[str] = None

class TransactionRefundInput(CamelModel):
    reason: str = Field(min_length=3)
    restock_inventory: bool = True
    items_to_refund: Optional[List[dict]] = None

