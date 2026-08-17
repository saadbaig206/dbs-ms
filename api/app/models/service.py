from sqlalchemy import Column, String, Float, Integer, JSON
from sqlalchemy.ext.mutable import MutableList
from app.models.base import Base

class ServiceItem(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    assigned_staff_ids = Column(JSON, nullable=False, default=list)
    assigned_staff_names = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="Active") # Active, Inactive, Out of Stock (dynamic)
    image = Column(String, nullable=True)
    description = Column(String, nullable=True)
    required_inventory = Column(MutableList.as_mutable(JSON), nullable=False, default=list)
