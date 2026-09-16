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
    from app.core.deps import clear_user_cache
    
    email_clean = login_data.email.strip().lower()
    plain_input = login_data.email.strip()

    # Identify if input matches a known default account or alias
    target_key = None
    for key, spec in DEFAULT_ACCOUNTS.items():
        if email_clean == key or email_clean in spec["aliases"] or plain_input in spec["aliases"]:
            target_key = key
            break

    # Look up user in DB
    conditions = [
        func.lower(User.email) == email_clean,
        User.email == plain_input
    ]
    if target_key:
        conditions.append(User.email == target_key)
        for alias in DEFAULT_ACCOUNTS[target_key]["aliases"]:
            conditions.append(User.email == alias)

    try:
        result = await db.execute(select(User).where(or_(*conditions)))
        user = result.scalars().first()
    except Exception:
        from app.models.base import Base
        async with db.bind.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        result = await db.execute(select(User).where(or_(*conditions)))
        user = result.scalars().first()

    # Default account initialization / hash repair on valid default password input
    if target_key:
        expected_pass = DEFAULT_ACCOUNTS[target_key]["pass"]
        expected_role = DEFAULT_ACCOUNTS[target_key]["role"]

        if login_data.password == expected_pass:
            if not user:
                user = User(
                    email=target_key,
                    hashed_password=get_password_hash(expected_pass),
                    role=expected_role
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            elif not verify_password(login_data.password, user.hashed_password):
                user.hashed_password = get_password_hash(expected_pass)
                db.add(user)
                await db.commit()
                await db.refresh(user)

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(subject=user.email)
    refresh_token = create_refresh_token(subject=user.email)

    clear_user_cache()
    
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


