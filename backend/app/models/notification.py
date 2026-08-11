from sqlalchemy import Column, String, Boolean
from app.models.base import Base

class NotificationItem(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    time = Column(String, nullable=False) # e.g. "Just now", "2 hours ago", or ISO/readable time
    type = Column(String, nullable=False) # appointment, payment, inventory, staff, schedule
    read = Column(Boolean, default=False, nullable=False)
