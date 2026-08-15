from app.schemas.base import CamelModel

class NotificationBase(CamelModel):
    title: str
    message: str
    time: str
    type: str
    read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
