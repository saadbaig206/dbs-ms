from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel

class InventoryBase(CamelModel):
    item_name: str
    category: str
    quantity: int = Field(ge=0)
    min_stock: int = Field(ge=0)
    supplier: str
    price: float = Field(ge=0)
    last_restocked: str

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(CamelModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    supplier: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    last_restocked: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: str
    status: str
