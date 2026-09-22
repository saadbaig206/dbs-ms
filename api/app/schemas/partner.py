from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel

class PartnerProfileInput(CamelModel):
    partner_name: str
    equity_percentage: float = Field(ge=0, le=100)
    initial_investment: float = Field(ge=0)
    notes: Optional[str] = None

class PartnerDrawingInput(CamelModel):
    partner_id: str
    date: str
    amount: float = Field(gt=0)
    payment_method: str = "Bank Transfer"
    notes: Optional[str] = None

class PartnerDrawingResponse(CamelModel):
    id: str
    partner_id: str
    partner_name: str
    date: str
    amount: float
    payment_method: str
    notes: Optional[str] = None
    created_by: Optional[str] = None

class PartnerEquityReportItem(CamelModel):
    id: str
    partner_name: str
    equity_percentage: float
    initial_investment: float
    profit_share: float
    total_withdrawn: float
    net_capital_balance: float
    market_brand_stake: float
    drawings_count: int

class PartnerEquityOverviewResponse(CamelModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    estimated_brand_valuation: float
    partners: List[PartnerEquityReportItem]
    recent_drawings: List[PartnerDrawingResponse]
