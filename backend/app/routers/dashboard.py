from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_admin_user
from app.services.dashboard import get_dashboard_aggregates

router = APIRouter()

@router.get("", response_model=dict)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    aggregates = await get_dashboard_aggregates(db)
    return aggregates
