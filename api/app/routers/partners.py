import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_admin_or_partner_user, get_admin_user
from app.models.partner import PartnerProfile, PartnerDrawing
from app.models.transaction import FinancialTransaction
from app.models.expense import ExpenseItem
from app.models.user import User
from app.schemas.partner import (
    PartnerProfileInput,
    PartnerDrawingInput,
    PartnerDrawingResponse,
    PartnerEquityReportItem,
    PartnerEquityOverviewResponse
)
from app.routers.bootstrap import invalidate_bootstrap_cache

router = APIRouter()

@router.get("/equity", response_model=PartnerEquityOverviewResponse)
async def get_partner_equity_overview(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    """Retrieve full partner equity balances, cumulative withdrawals to date, and market brand valuation."""
    # 1. Ensure profiles exist for partner/admin users if none exist
    p_res = await db.execute(select(PartnerProfile))
    profiles = p_res.scalars().all()

    if not profiles:
        # Auto-seed from existing partners/admins
        users_res = await db.execute(select(User).where(User.role.in_(["admin", "partner"])))
        users = users_res.scalars().all()
        created_profiles = []
        default_shares = [60.0, 40.0] if len(users) == 2 else [round(100.0 / max(1, len(users)), 1) for _ in users]
        
        for idx, u in enumerate(users):
            clean_name = u.email.split('@')[0].replace('.', ' ').title()
            p_id = f"PRT-{secrets.token_hex(2).upper()}"
            prof = PartnerProfile(
                id=p_id,
                user_id=u.id,
                partner_name=clean_name,
                equity_percentage=default_shares[idx] if idx < len(default_shares) else round(100.0 / max(1, len(users)), 1),
                initial_investment=0.0,
                notes="Partner capital account"
            )
            db.add(prof)
            created_profiles.append(prof)
        
        await db.commit()
        profiles = created_profiles

    # 2. Calculate Clinic Financial Performance (Sales revenue excluding Debt Settlements and refunds)
    txn_res = await db.execute(select(FinancialTransaction))
    transactions = txn_res.scalars().all()
    active_txns = [
        t for t in transactions 
        if (t.status or '').lower() not in ('refunded', 'cancelled')
        and getattr(t, 'transaction_type', 'Sale') != 'Debt_Settlement'
        and t.service_name != 'Client Debt Settlement'
    ]
    total_rev = sum(t.grand_total for t in active_txns)

    exp_res = await db.execute(select(ExpenseItem))
    expenses = exp_res.scalars().all()
    paid_expenses = [e for e in expenses if (e.status or '').lower() == 'paid']
    operational_exp = sum(e.amount for e in paid_expenses if e.category != 'Inventory Purchase')

    # Include settled purchase bills (stock & product purchases)
    from app.models.purchase import PurchaseBill
    pb_res = await db.execute(select(PurchaseBill))
    purchase_bills = pb_res.scalars().all()
    purchase_exp = sum(b.amount_paid or 0.0 for b in purchase_bills)

    total_exp = operational_exp + purchase_exp
    net_profit = max(0.0, total_rev - total_exp)
    
    # 3. All drawings
    drw_res = await db.execute(select(PartnerDrawing).order_by(PartnerDrawing.date.desc(), PartnerDrawing.id.desc()))
    all_drawings = drw_res.scalars().all()

    # 4. Brand Valuation: 5x Net Operating Profit Multiple + Total Tangible Capital Baseline
    total_initial_invested = sum(p.initial_investment for p in profiles)
    estimated_brand_valuation = (net_profit * 5.0) + total_initial_invested

    partner_reports: List[PartnerEquityReportItem] = []
    for p in profiles:
        partner_draws = [d for d in all_drawings if d.partner_id == p.id]
        total_withdrawn = sum(d.amount for d in partner_draws)
        profit_share = net_profit * (p.equity_percentage / 100.0)
        net_capital = (p.initial_investment + profit_share) - total_withdrawn
        brand_stake = estimated_brand_valuation * (p.equity_percentage / 100.0)

        partner_reports.append(PartnerEquityReportItem(
            id=p.id,
            partner_name=p.partner_name,
            equity_percentage=p.equity_percentage,
            initial_investment=p.initial_investment,
            profit_share=profit_share,
            total_withdrawn=total_withdrawn,
            net_capital_balance=net_capital,
            market_brand_stake=brand_stake,
            drawings_count=len(partner_draws)
        ))

    recent_drawings_resp = [
        PartnerDrawingResponse(
            id=d.id,
            partner_id=d.partner_id,
            partner_name=d.partner_name,
            date=d.date,
            amount=d.amount,
            payment_method=d.payment_method,
            notes=d.notes,
            created_by=d.created_by
        ) for d in all_drawings[:10]
    ]

    return PartnerEquityOverviewResponse(
        total_revenue=total_rev,
        total_expenses=total_exp,
        net_profit=net_profit,
        estimated_brand_valuation=estimated_brand_valuation,
        partners=partner_reports,
        recent_drawings=recent_drawings_resp
    )

@router.post("/drawings", response_model=PartnerDrawingResponse)
async def record_partner_drawing(
    drawing_in: PartnerDrawingInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    """Record a partner withdrawal / equity distribution."""
    if drawing_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Drawing amount must be greater than 0")

    p_res = await db.execute(select(PartnerProfile).where(PartnerProfile.id == drawing_in.partner_id))
    profile = p_res.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Partner profile not found")

    # Verify that drawing does not exceed partner's available net capital balance
    txn_res = await db.execute(select(FinancialTransaction))
    transactions = txn_res.scalars().all()
    active_txns = [
        t for t in transactions 
        if (t.status or '').lower() not in ('refunded', 'cancelled')
        and getattr(t, 'transaction_type', 'Sale') != 'Debt_Settlement'
        and t.service_name != 'Client Debt Settlement'
    ]
    total_rev = sum(t.grand_total for t in active_txns)

    exp_res = await db.execute(select(ExpenseItem))
    expenses = exp_res.scalars().all()
    paid_expenses = [e for e in expenses if (e.status or '').lower() == 'paid']
    operational_exp = sum(e.amount for e in paid_expenses if e.category != 'Inventory Purchase')

    from app.models.purchase import PurchaseBill
    pb_res = await db.execute(select(PurchaseBill))
    purchase_bills = pb_res.scalars().all()
    purchase_exp = sum(b.amount_paid or 0.0 for b in purchase_bills)

    total_exp = operational_exp + purchase_exp
    net_profit = max(0.0, total_rev - total_exp)

    drw_res = await db.execute(select(PartnerDrawing).where(PartnerDrawing.partner_id == profile.id))
    partner_draws = drw_res.scalars().all()
    total_withdrawn = sum(d.amount for d in partner_draws)
    profit_share = net_profit * (profile.equity_percentage / 100.0)
    net_capital = (profile.initial_investment + profit_share) - total_withdrawn

    if drawing_in.amount > net_capital:
        raise HTTPException(
            status_code=400,
            detail=f"Drawing amount (Rs. {drawing_in.amount}) exceeds partner's available net capital balance (Rs. {round(net_capital, 2)})."
        )

    drawing_id = f"DRW-{datetime.now().year}-{secrets.token_hex(2).upper()}"
    active_user = getattr(current_user, 'email', 'Admin/Partner')

    db_drawing = PartnerDrawing(
        id=drawing_id,
        partner_id=profile.id,
        partner_name=profile.partner_name,
        date=drawing_in.date,
        amount=drawing_in.amount,
        payment_method=drawing_in.payment_method,
        notes=drawing_in.notes or "Equity Drawing / Distribution",
        created_by=active_user
    )
    db.add(db_drawing)

    # Log ExpenseItem so Treasury cash flows and drawer reports reflect equity payouts
    exp_id = f"EXP-DRW-{secrets.token_hex(3).upper()}"
    exp_item = ExpenseItem(
        id=exp_id,
        title=f"Partner Drawing: {profile.partner_name}",
        category="Partner Drawing",
        amount=drawing_in.amount,
        actual_amount=drawing_in.amount,
        amount_paid=drawing_in.amount,
        remaining_amount=0.0,
        date=drawing_in.date or datetime.now().strftime("%Y-%m-%d"),
        status="Paid",
        payment_method=drawing_in.payment_method or "Cash",
        vendor_name=profile.partner_name,
        branch_id=None,
        added_by=active_user,
        paid_by=active_user,
        notes=f"Partner Drawing / Capital Distribution ({drawing_id})"
    )
    db.add(exp_item)

    await db.commit()
    await db.refresh(db_drawing)
    invalidate_bootstrap_cache()

    return PartnerDrawingResponse(
        id=db_drawing.id,
        partner_id=db_drawing.partner_id,
        partner_name=db_drawing.partner_name,
        date=db_drawing.date,
        amount=db_drawing.amount,
        payment_method=db_drawing.payment_method,
        notes=db_drawing.notes,
        created_by=db_drawing.created_by
    )

@router.post("/profiles", response_model=dict)
async def upsert_partner_profile(
    profile_in: PartnerProfileInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    """Create or update a partner equity profile."""
    if profile_in.equity_percentage < 0 or profile_in.equity_percentage > 100:
        raise HTTPException(status_code=400, detail="Equity percentage must be between 0% and 100%")

    res = await db.execute(select(PartnerProfile).where(PartnerProfile.partner_name.ilike(profile_in.partner_name)))
    profile = res.scalars().first()

    # Verify that total percentage across all partners does not exceed 100%
    all_res = await db.execute(select(PartnerProfile))
    all_profiles = all_res.scalars().all()
    other_equity = sum(p.equity_percentage for p in all_profiles if (not profile or p.id != profile.id))
    if other_equity + profile_in.equity_percentage > 100.001:
        raise HTTPException(
            status_code=400,
            detail=f"Total partner equity cannot exceed 100%. Currently allocated to other partners: {round(other_equity, 2)}%. Max allowable: {round(100.0 - other_equity, 2)}%"
        )

    if profile:
        profile.equity_percentage = profile_in.equity_percentage
        profile.initial_investment = profile_in.initial_investment
        profile.notes = profile_in.notes
    else:
        p_id = f"PRT-{secrets.token_hex(2).upper()}"
        profile = PartnerProfile(
            id=p_id,
            partner_name=profile_in.partner_name,
            equity_percentage=profile_in.equity_percentage,
            initial_investment=profile_in.initial_investment,
            notes=profile_in.notes
        )
        db.add(profile)

    await db.commit()
    invalidate_bootstrap_cache()
    return {"message": "Partner profile updated successfully", "id": profile.id}
