import time
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.user import User

# In-memory user authentication cache to avoid redundant DB queries on parallel API requests
_USER_CACHE = {}
CACHE_TTL = 300  # 5 minutes

def clear_user_cache():
    global _USER_CACHE
    _USER_CACHE.clear()

def set_cached_user(token: str, user: User, branch_id: Optional[str] = None):
    global _USER_CACHE
    _USER_CACHE[token] = {
        "user": user,
        "branch_id": branch_id,
        "time": time.time()
    }

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try header first, then cookie
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    now = time.time()
    cached = _USER_CACHE.get(token)
    if cached and (now - cached["time"] < CACHE_TTL):
        user = cached["user"]
        setattr(user, "_cached_branch_id", cached.get("branch_id"))
        return user

    email_clean = email.strip().lower()
    from sqlalchemy import func
    result = await db.execute(select(User).where(func.lower(User.email) == email_clean))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception

    staff_branch_id = None
    if user.role == "staff":
        from app.models.staff import Staff
        s_res = await db.execute(select(Staff).where(func.lower(Staff.email) == email_clean))
        staff_member = s_res.scalars().first()
        if staff_member and staff_member.status == "Inactive":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Staff account is inactive or disabled.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if staff_member:
            staff_branch_id = staff_member.branch_id

    setattr(user, "_cached_branch_id", staff_branch_id)
    _USER_CACHE[token] = {
        "user": user,
        "branch_id": staff_branch_id,
        "time": now
    }

    return user

def require_role(allowed_roles: list[str]):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
    return dependency

# Helper dependencies
get_admin_user = require_role(["admin"])
get_admin_or_partner_user = require_role(["admin", "partner"])
get_staff_user = require_role(["admin", "staff", "partner"])

async def get_user_branch_id(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[str]:
    branch_id = request.query_params.get("branch_id") or request.headers.get("X-Branch-ID")
    if current_user.role == "staff":
        cached_b_id = getattr(current_user, "_cached_branch_id", None)
        if cached_b_id:
            return cached_b_id
        return branch_id
    elif current_user.role in ("admin", "partner"):
        return branch_id
    return None

