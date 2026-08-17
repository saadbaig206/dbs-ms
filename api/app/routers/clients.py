from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user, get_user_branch_id
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter()

@router.get("", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(Client)
    if branch_id:
        query = query.where(Client.branch_id == branch_id)
    if search:
        query = query.where(Client.name.ilike(f"%{search}%") | Client.phone.ilike(f"%{search}%") | Client.cnic.ilike(f"%{search}%"))
        
    result = await db.execute(query.order_by(Client.id.desc()))
    return result.scalars().all()

@router.post("", response_model=ClientResponse)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    count_result = await db.execute(select(Client))
    count = len(count_result.scalars().all())
    client_id = f"CLT-{800 + count + 1}"
    
    db_client = Client(
        id=client_id,
        name=client_in.name,
        phone=client_in.phone,
        cnic=client_in.cnic,
        gender=client_in.gender,
        age=client_in.age,
        address=client_in.address,
        assigned_staff_id=client_in.assigned_staff_id,
        assigned_staff_name=client_in.assigned_staff_name,
        preferred_service=client_in.preferred_service,
        notes=client_in.notes,
        total_spent=0.0,
        visits_count=1,
        history=[],
        joined_date=datetime.now().strftime("%Y-%m-%d"),
        branch_id=user_branch_id or client_in.branch_id
    )
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    return db_client

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(Client).where(Client.id == client_id)
    if branch_id:
        query = query.where(Client.branch_id == branch_id)
    result = await db.execute(query)
    db_client = result.scalars().first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "history" and value is not None:
            # Map list of schema to list of dict
            setattr(db_client, field, [item.model_dump() for item in value])
        else:
            setattr(db_client, field, value)
        
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    return db_client
