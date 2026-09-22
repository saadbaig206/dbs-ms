from sqlalchemy import Column, String, Integer, Float, ForeignKey
from app.models.base import Base

class ClientPackage(Base):
    __tablename__ = "client_packages"

    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    client_name = Column(String, nullable=False, index=True)
    package_name = Column(String, nullable=False)
    service_id = Column(String, nullable=False)
    total_sessions = Column(Integer, nullable=False, default=3)
    used_sessions = Column(Integer, nullable=False, default=0)
    remaining_sessions = Column(Integer, nullable=False, default=3)
    total_amount_paid = Column(Float, nullable=False)
    price_per_session = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="Active") # Active, Completed, Expired
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    purchase_date = Column(String, nullable=False) # YYYY-MM-DD
    expiry_date = Column(String, nullable=True)
    notes = Column(String, nullable=True)


class PackageRedemptionLog(Base):
    __tablename__ = "package_redemption_logs"

    id = Column(String, primary_key=True, index=True)
    package_id = Column(String, ForeignKey("client_packages.id"), nullable=False, index=True)
    client_name = Column(String, nullable=False)
    session_number = Column(Integer, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    time = Column(String, nullable=True)
    staff_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
