from sqlalchemy import Column, String, Float, Integer, ForeignKey
from app.models.base import Base

class PartnerProfile(Base):
    __tablename__ = "partner_profiles"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True) # Optional link to users.id
    partner_name = Column(String, nullable=False, unique=True, index=True)
    equity_percentage = Column(Float, nullable=False, default=50.0) # e.g. 60.0%
    initial_investment = Column(Float, nullable=False, default=0.0) # Initial capital contribution
    notes = Column(String, nullable=True)


class PartnerDrawing(Base):
    __tablename__ = "partner_drawings"

    id = Column(String, primary_key=True, index=True)
    partner_id = Column(String, ForeignKey("partner_profiles.id"), nullable=False, index=True)
    partner_name = Column(String, nullable=False)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False, default="Bank Transfer")
    notes = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
