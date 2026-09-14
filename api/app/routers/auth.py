from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter()

DEFAULT_ACCOUNTS = {
    "admin@gmail.com": {"pass": "admin", "role": "admin", "aliases": ["admin"]},
    "staff@gmail.com": {"pass": "staff", "role": "staff", "aliases": ["staff"]},
    "drzaini": {"pass": "drzaini109", "role": "admin", "aliases": ["drzaini@gmail.com", "drzaini109"]}
}

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func, or_
    from app.core.security import get_password_hash
    email_clean = login_data.email.strip().lower()

    # Identify if input matches a known default account or alias
    target_key = None
    for key, spec in DEFAULT_ACCOUNTS.items():
        if email_clean == key or email_clean in spec["aliases"]:
            target_key = key
            break

    try:
        if target_key:
            aliases = DEFAULT_ACCOUNTS[target_key]["aliases"]
            conditions = [func.lower(User.email) == email_clean, func.lower(User.email) == target_key]
            for alias in aliases:
                conditions.append(func.lower(User.email) == alias)
            result = await db.execute(select(User).where(or_(*conditions)))
        else:
            result = await db.execute(select(User).where(func.lower(User.email) == email_clean))
        user = result.scalars().first()
    except Exception:
        from app.models.base import Base
        async with db.bind.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        result = await db.execute(select(User).where(func.lower(User.email) == email_clean))
        user = result.scalars().first()

    # Auto-heal default accounts if missing or password hash needs updating
    if target_key:
        expected_pass = DEFAULT_ACCOUNTS[target_key]["pass"]
        expected_role = DEFAULT_ACCOUNTS[target_key]["role"]

        if not user:
            if login_data.password == expected_pass:
                user = User(
                    email=target_key,
                    hashed_password=get_password_hash(expected_pass),
                    role=expected_role
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
        elif user and not verify_password(login_data.password, user.hashed_password) and login_data.password == expected_pass:
            user.hashed_password = get_password_hash(expected_pass)
            await db.commit()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    branch_id = None
    if current_user.role == "staff":
        from app.models.staff import Staff
        from sqlalchemy import func
        staff_result = await db.execute(select(Staff).where(func.lower(Staff.email) == func.lower(current_user.email)))
        staff_member = staff_result.scalars().first()
        if staff_member:
            branch_id = staff_member.branch_id

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": branch_id
    }

@router.get("/debug-db")
async def debug_db(db: AsyncSession = Depends(get_db)):
    try:
        from app.core.security import verify_password
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        users_info = []
        for u in users:
            is_admin_pass_correct = verify_password("admin", u.hashed_password) if u.email == "admin@gmail.com" else None
            is_staff_pass_correct = verify_password("staff", u.hashed_password) if u.email == "staff@gmail.com" else None
            users_info.append({
                "email": u.email,
                "role": u.role,
                "hashed_password": u.hashed_password,
                "test_pass_ok": is_admin_pass_correct if u.email == "admin@gmail.com" else is_staff_pass_correct
            })
            
        return {
            "status": "connected",
            "users_count": len(users),
            "users": users_info
        }
    except Exception as e:
        return {
            "status": "error",
            "error_detail": str(e)
        }

from typing import List
from app.core.deps import get_admin_user
from app.schemas.auth import PartnerCreate

@router.get("/partners", response_model=List[dict])
async def list_partners(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(User).where(User.role == "partner"))
    users = result.scalars().all()
    return [{"id": u.id, "username": u.email} for u in users]

@router.post("/partners", response_model=dict)
async def create_partner(
    partner_in: PartnerCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(User).where(User.email == partner_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Partner username already exists")
    
    from app.core.security import get_password_hash
    db_user = User(
        email=partner_in.username,
        hashed_password=get_password_hash(partner_in.password),
        role="partner"
    )
    db.add(db_user)
    await db.commit()
    return {"id": db_user.id, "username": db_user.email}

@router.delete("/partners/{partner_id}")
async def delete_partner(
    partner_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(User).where((User.id == partner_id) & (User.role == "partner")))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Partner not found")
    await db.delete(user)
    await db.commit()
    return {"message": "Partner deleted successfully"}


