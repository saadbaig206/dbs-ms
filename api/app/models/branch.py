from sqlalchemy import Column, String, Float
from app.models.base import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
