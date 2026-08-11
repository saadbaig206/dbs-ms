from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class InvoiceLineItemSchema(CamelModel):
    name: str
    price: float = Field(ge=0)
    quantity: int = Field(ge=1)

class FinancialTransactionBase(CamelModel):
    invoice_id: str
    client_name: str
    service_name: str
    amount: float = Field(ge=0)
    discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0)
    grand_total: float = Field(ge=0)
    date: str
    payment_method: str
    status: str = "Paid"
    items: Optional[List[InvoiceLineItemSchema]] = None

class FinancialTransactionCreate(CamelModel):
    client_name: str
    payment_method: str
    discount_percent: float = Field(default=0.0, ge=0)
    tax_percent: float = Field(default=0.0, ge=0)

class FinancialTransactionResponse(FinancialTransactionBase):
    id: str
