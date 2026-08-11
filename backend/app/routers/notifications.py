from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user
from app.models.notification import NotificationItem
from app.schemas.notification import NotificationResponse

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(NotificationItem).order_by(NotificationItem.id.desc()))
    return result.scalars().all()

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(NotificationItem).where(NotificationItem.id == notification_id))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.read = True
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification

@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(NotificationItem).where(NotificationItem.read == False))
    unread_notifications = result.scalars().all()
    for notification in unread_notifications:
        notification.read = True
        db.add(notification)
        
    await db.commit()
    return {"message": "All notifications marked as read"}
