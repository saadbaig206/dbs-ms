from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_user_branch_id
from app.models.appointment import Appointment
from app.models.notification import NotificationItem
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse

router = APIRouter()

async def check_double_booking(db: AsyncSession, staff_id: str, date: str, time: str, exclude_id: Optional[str] = None):
    query = select(Appointment).where(
        Appointment.staff_id == staff_id,
        Appointment.date == date,
        Appointment.time == time,
        Appointment.status != "Cancelled"
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)
        
    result = await db.execute(query)
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Staff member is already booked on {date} at {time}."
        )

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(Appointment)
    if search:
        query = query.where(Appointment.client_name.ilike(f"%{search}%") | Appointment.staff_name.ilike(f"%{search}%"))
    active_branch_id = user_branch_id or branch_id
    if active_branch_id:
        query = query.where(Appointment.branch_id == active_branch_id)
        
    result = await db.execute(query.order_by(Appointment.id.desc()))
    return result.scalars().all()

@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    apt_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    # Enforce no double-booking
    await check_double_booking(db, apt_in.staff_id, apt_in.date, apt_in.time)
    
    count_result = await db.execute(select(Appointment))
    count = len(count_result.scalars().all())
    apt_id = f"APT-{1000 + count + 1}"
    
    db_apt = Appointment(
        id=apt_id,
        client_id=apt_in.client_id,
        client_name=apt_in.client_name,
        phone=apt_in.phone,
        service_id=apt_in.service_id,
        service_name=apt_in.service_name,
        staff_id=apt_in.staff_id,
        staff_name=apt_in.staff_name,
        date=apt_in.date,
        time=apt_in.time,
        status=apt_in.status,
        notes=apt_in.notes,
        price=apt_in.price,
        branch_id=apt_in.branch_id
    )
    db.add(db_apt)
    
    # Create notification
    notification = NotificationItem(
        id=f"NOT-{int(datetime.now().timestamp() * 1000)}",
        title="New Booking Created",
        message=f"{apt_in.client_name} booked {apt_in.service_name} with {apt_in.staff_name} for {apt_in.date} at {apt_in.time}.",
        time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        type="appointment",
        read=False
    )
    db.add(notification)
    
    await db.commit()
    await db.refresh(db_apt)
    return db_apt

@router.put("/{apt_id}", response_model=AppointmentResponse)
async def update_appointment(
    apt_id: str,
    apt_in: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == apt_id))
    db_apt = result.scalars().first()
    if not db_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    update_data = apt_in.model_dump(exclude_unset=True)
    
    # If date, time, or staff_id is changing, check double booking
    new_staff_id = update_data.get("staff_id", db_apt.staff_id)
    new_date = update_data.get("date", db_apt.date)
    new_time = update_data.get("time", db_apt.time)
    
    if (new_staff_id != db_apt.staff_id or new_date != db_apt.date or new_time != db_apt.time) and update_data.get("status", db_apt.status) != "Cancelled":
        await check_double_booking(db, new_staff_id, new_date, new_time, exclude_id=apt_id)

    for field, value in update_data.items():
        setattr(db_apt, field, value)
        
    db.add(db_apt)
    await db.commit()
    await db.refresh(db_apt)
    return db_apt

@router.delete("/{apt_id}")
async def delete_appointment(
    apt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == apt_id))
    db_apt = result.scalars().first()
    if not db_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    await db.delete(db_apt)
    await db.commit()
    return {"message": "Appointment deleted successfully"}

from app.services.whatsapp_service import WhatsAppService
from app.models.branch import Branch

@router.post("/{apt_id}/reminder/send", response_model=AppointmentResponse)
async def send_appointment_reminder(
    apt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == apt_id))
    db_apt = result.scalars().first()
    if not db_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    branch_name = "our clinic"
    if db_apt.branch_id:
        branch_result = await db.execute(select(Branch).where(Branch.id == db_apt.branch_id))
        branch = branch_result.scalars().first()
        if branch:
            branch_name = f"our {branch.name} branch"
            
    message = (
        f"Dear {db_apt.client_name}, this is a reminder for your upcoming appointment for "
        f"{db_apt.service_name} scheduled on {db_apt.date} at {db_apt.time} at {branch_name} "
        f"with specialist {db_apt.staff_name}. Thank you!"
    )
    
    await WhatsAppService.send_message(db_apt.phone, message)
    
    db_apt.reminder_status = "Sent"
    db.add(db_apt)
    await db.commit()
    await db.refresh(db_apt)
    return db_apt

@router.post("/{apt_id}/reminder/reject", response_model=AppointmentResponse)
async def reject_appointment_reminder(
    apt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == apt_id))
    db_apt = result.scalars().first()
    if not db_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    db_apt.reminder_status = "Rejected"
    db.add(db_apt)
    await db.commit()
    await db.refresh(db_apt)
    return db_apt
