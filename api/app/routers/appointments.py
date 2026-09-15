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

import secrets

def parse_time_minutes(time_str: str) -> int:
    """Parse time string like '10:00 AM', '10:30', '14:00' into minutes from midnight."""
    clean = time_str.strip().upper()
    is_pm = "PM" in clean
    is_am = "AM" in clean
    clean = clean.replace("AM", "").replace("PM", "").strip()
    parts = clean.split(":")
    hours = int(parts[0]) if len(parts) > 0 else 0
    minutes = int(parts[1]) if len(parts) > 1 else 0
    if is_pm and hours < 12:
        hours += 12
    elif is_am and hours == 12:
        hours = 0
    return hours * 60 + minutes

async def check_double_booking(db: AsyncSession, staff_id: str, date: str, time: str, exclude_id: Optional[str] = None, duration_minutes: int = 45):
    new_start = parse_time_minutes(time)
    new_end = new_start + duration_minutes

    query = select(Appointment).where(
        Appointment.staff_id == staff_id,
        Appointment.date == date,
        Appointment.status != "Cancelled"
    ).with_for_update()
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)
        
    result = await db.execute(query)
    existing_apts = result.scalars().all()

    for apt in existing_apts:
        existing_start = parse_time_minutes(apt.time)
        existing_end = existing_start + 45  # Standard appointment slot duration
        if new_start < existing_end and new_end > existing_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Staff member is already booked on {date} around {apt.time} (conflict with appointment ID {apt.id})."
            )

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
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
        
    query = query.order_by(Appointment.id.desc())
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    apt_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    # Enforce no double-booking
    await check_double_booking(db, apt_in.staff_id, apt_in.date, apt_in.time)
    
    apt_id = f"APT-{secrets.token_hex(3).upper()}"
    
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
        branch_id=apt_in.branch_id,
        category=apt_in.category
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

def verify_reminder_24h_window(date_str: str, time_str: str):
    try:
        clean_time = time_str.strip().upper()
        is_pm = "PM" in clean_time
        is_am = "AM" in clean_time
        clean = clean_time.replace("AM", "").replace("PM", "").strip()
        parts = clean.split(":")
        hours = int(parts[0]) if len(parts) > 0 else 0
        minutes = int(parts[1]) if len(parts) > 1 else 0
        if is_pm and hours < 12:
            hours += 12
        elif is_am and hours == 12:
            hours = 0
            
        apt_date = datetime.strptime(date_str, "%Y-%m-%d")
        apt_datetime = apt_date.replace(hour=hours, minute=minutes)
        now = datetime.now()
        diff_hours = (apt_datetime - now).total_seconds() / 3600.0
        
        if diff_hours > 24.0:
            raise HTTPException(
                status_code=400,
                detail="Reminder sending option is only available 24 hours prior to the appointment."
            )
    except HTTPException:
        raise
    except Exception:
        pass

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
        
    verify_reminder_24h_window(db_apt.date, db_apt.time)

    clinic_name = settings.PROJECT_NAME
    location_str = "Main Clinic Branch"
    if db_apt.branch_id:
        branch_result = await db.execute(select(Branch).where(Branch.id == db_apt.branch_id))
        branch = branch_result.scalars().first()
        if branch:
            clinic_name = branch.name
            location_str = branch.location
            
    message = (
        f"Hi {db_apt.client_name}!\n"
        f"This is a reminder that you have an appointment with {clinic_name} tomorrow.\n\n"
        f"Date: {db_apt.date}\n"
        f"Time: {db_apt.time}\n"
        f"Location: {location_str}\n\n"
        f"We look forward to seeing you! If you need to reschedule, please contact us.\n\n"
        f"Thank you!"
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

@router.post("/{apt_id}/reminder/mark-sent", response_model=AppointmentResponse)
async def mark_appointment_reminder_sent(
    apt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == apt_id))
    db_apt = result.scalars().first()
    if not db_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    verify_reminder_24h_window(db_apt.date, db_apt.time)

    db_apt.reminder_status = "Sent"
    db.add(db_apt)
    await db.commit()
    await db.refresh(db_apt)
    return db_apt

