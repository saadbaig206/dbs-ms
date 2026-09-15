from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user
from app.models.attendance import AttendanceRecord
from app.models.staff import Staff
from app.models.branch import Branch
from app.schemas.attendance import AttendanceCreate, AttendanceResponse

router = APIRouter()

@router.get("", response_model=List[AttendanceResponse])
async def list_attendance(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    query = select(AttendanceRecord)
    if date:
        query = query.where(AttendanceRecord.date == date)
        
    result = await db.execute(query.order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()))
    return result.scalars().all()

@router.post("", response_model=AttendanceResponse)
async def mark_attendance(
    attendance_in: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Verify staff member exists
    staff_result = await db.execute(select(Staff).where(Staff.id == attendance_in.staff_id))
    staff_member = staff_result.scalars().first()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Geolocation restriction check
    if current_user.role != "admin" and staff_member.branch_id:
        branch_result = await db.execute(select(Branch).where(Branch.id == staff_member.branch_id))
        branch = branch_result.scalars().first()
        if branch and branch.latitude is not None and branch.longitude is not None:
            if attendance_in.latitude is None or attendance_in.longitude is None:
                raise HTTPException(
                    status_code=400,
                    detail="GPS Location access is required to mark attendance."
                )
            
            # Haversine distance formula
            import math
            lat1, lon1 = attendance_in.latitude, attendance_in.longitude
            lat2, lon2 = branch.latitude, branch.longitude
            
            R = 6371000.0  # Earth's radius in meters
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            delta_phi = math.radians(lat2 - lat1)
            delta_lambda = math.radians(lon2 - lon1)
            
            a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
            c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
            distance = R * c
            
            # Enforce 50 meters threshold
            if distance > 50.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"You are not at your assigned branch ({branch.name}). Distance: {int(distance)}m (Limit: 50m)"
                )

    # Check if record already exists for today
    existing_result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.staff_id == attendance_in.staff_id,
            AttendanceRecord.date == today_str
        )
    )
    existing_record = existing_result.scalars().first()
    
    current_time_str = attendance_in.client_time or datetime.now().strftime("%I:%M %p")
    check_in_time = attendance_in.check_in_time
    check_out_time = attendance_in.check_out_time

    if attendance_in.status == "Checked Out":
        if not existing_record:
            raise HTTPException(
                status_code=400,
                detail="Cannot check-out. You have not checked-in yet today."
            )
        existing_record.check_out_time = check_out_time or current_time_str
        existing_record.status = "Checked Out"
        db_record = existing_record
    else:
        if attendance_in.status in ["Present", "Late"]:
            check_in_time = check_in_time or current_time_str
            
        if existing_record:
            existing_record.status = attendance_in.status
            existing_record.notes = attendance_in.notes or existing_record.notes
            if check_in_time:
                existing_record.check_in_time = check_in_time
            db_record = existing_record
        else:
            import secrets
            record_id = f"ATT-{secrets.token_hex(3).upper()}"
            
            db_record = AttendanceRecord(
                id=record_id,
                staff_id=attendance_in.staff_id,
                staff_name=staff_member.name,
                role=staff_member.role,
                date=today_str,
                status=attendance_in.status,
                check_in_time=check_in_time,
                check_out_time=check_out_time,
                notes=attendance_in.notes
            )
            db.add(db_record)

    await db.commit()
    await db.refresh(db_record)
    return db_record

@router.delete("/{record_id}")
async def revert_attendance(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(AttendanceRecord).where(AttendanceRecord.id == record_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    await db.delete(record)
    await db.commit()
    return {"message": "Attendance reverted successfully"}
