from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_admin_or_partner_user, get_user_branch_id
from app.services.dashboard import get_dashboard_aggregates

router = APIRouter()

@router.get("", response_model=dict)
async def get_dashboard(
    branch_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    active_branch = user_branch_id or branch_id
    aggregates = await get_dashboard_aggregates(db, branch_id=active_branch)
    return aggregates

