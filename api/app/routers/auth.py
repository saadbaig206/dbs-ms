from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fallback initialization for serverless runtimes (like Vercel) where ASGI lifespan events are skipped
    try:
        result = await db.execute(select(User))
        users_exist = bool(result.scalars().first())
    except Exception:
        from app.models.base import Base
        async with db.bind.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        users_exist = False

    if not users_exist:
        from app.core.security import get_password_hash
        admin_user = User(
            email="admin@gmail.com",
            hashed_password=get_password_hash("admin"),
            role="admin"
        )
        staff_user = User(
            email="staff@gmail.com",
            hashed_password=get_password_hash("staff"),
            role="staff"
        )
        db.add_all([admin_user, staff_user])
        await db.commit()

    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()
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
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

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

