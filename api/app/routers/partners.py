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

EXCLUDED_EMAILS = {"admin@gmail.com", "staff@gmail.com"}

def format_partner_name(email_or_username: str) -> str:
    raw = email_or_username.split('@')[0]
    cleaned = raw.replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
    if cleaned.lower().startswith("dr") and len(cleaned) > 2 and not cleaned[2].isspace():
        cleaned = "Dr " + cleaned[2:]
    return cleaned.title()

def is_payer_match(payer: Optional[str], partner_name: str, user_email: Optional[str] = None) -> bool:
    if not payer:
        return False
    p_clean = "".join(c for c in payer.lower() if c.isalnum())
    if not p_clean:
        return False
    name_clean = "".join(c for c in partner_name.lower() if c.isalnum())
    if name_clean and (p_clean == name_clean or name_clean in p_clean or p_clean in name_clean):
        return True
    if user_email:
        u_clean = "".join(c for c in user_email.lower().split('@')[0] if c.isalnum())
        if u_clean and (p_clean == u_clean or u_clean in p_clean or p_clean in u_clean):
            return True
    # Aliases for Dr. Zaini (clinic founder & managing admin partner)
    if ("admin" in p_clean or "drzaini" in p_clean or "zaini" in p_clean) and "zaini" in name_clean:
        return True
    # Aliases for Sheraz
    if "sheraz" in p_clean and "sheraz" in name_clean:
        return True
    return False

def calculate_partner_investments(profiles: list, paid_expenses: list) -> dict:
    """
    Calculates invested capital for each active partner based strictly on direct expenses they paid.
    There are no direct clinic funds; each partner and admin pays expenses individually.
    Every single penny paid (including partial salary payouts) is recorded directly as their capital without settling according to share.
    """
    direct_investments = {p.id: float(p.initial_investment or 0.0) for p in profiles}

    # Default managing partner (Dr. Zaini) for legacy unassigned paid expenses
    default_partner = next((p for p in profiles if "zaini" in (p.partner_name or "").lower()), profiles[0] if profiles else None)

    for e in paid_expenses:
        if e.category == "Partner Drawing" or "Partner Drawing" in (e.title or ""):
            continue

        if e.payment_logs and isinstance(e.payment_logs, list) and len(e.payment_logs) > 0:
            for log in e.payment_logs:
                if not isinstance(log, dict):
                    continue
                log_amt = float(log.get("amount", 0.0))
                if log_amt <= 0:
                    continue
                log_payer = log.get("paidBy") or log.get("paid_by") or e.paid_by
                matched_p = next((p for p in profiles if is_payer_match(log_payer, p.partner_name, getattr(p, "user_email", None))), None)
                if not matched_p and default_partner:
                    matched_p = default_partner
                if matched_p:
                    direct_investments[matched_p.id] += log_amt
            continue

        amt = float(e.amount_paid if e.amount_paid is not None else (e.amount if (e.status or "").lower() == "paid" else 0.0))
        if amt <= 0:
            continue
        matched_p = next((p for p in profiles if is_payer_match(e.paid_by, p.partner_name, getattr(p, "user_email", None))), None)
        if not matched_p and default_partner:
            matched_p = default_partner
        if matched_p:
            direct_investments[matched_p.id] += amt

    total_investments = {}
    for p in profiles:
        total_investments[p.id] = round(direct_investments[p.id], 2)

    return total_investments


router = APIRouter()

@router.get("/equity", response_model=PartnerEquityOverviewResponse)
async def get_partner_equity_overview(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    """Retrieve full partner equity balances, cumulative withdrawals to date, and market brand valuation."""
    # 1. Dynamically sync all eligible admin & partner users (excluding admin@gmail.com and staff@gmail.com)
    users_res = await db.execute(
        select(User).where(
            User.role.in_(["admin", "partner"]),
            ~User.email.ilike("admin@gmail.com"),
            ~User.email.ilike("staff@gmail.com"),
        )
    )
    eligible_users = users_res.scalars().all()
    eligible_user_map = {u.id: u for u in eligible_users}

    p_res = await db.execute(select(PartnerProfile))
    all_profiles = p_res.scalars().all()

    # Clean up any partner profiles belonging to excluded accounts
    valid_profiles = []
    for prof in all_profiles:
        prof_name_lower = (prof.partner_name or "").lower()
        if "admin@gmail" in prof_name_lower or "staff@gmail" in prof_name_lower:
            await db.delete(prof)
            continue
        valid_profiles.append(prof)

    # Ensure every eligible user has an active partner profile
    existing_user_ids = {p.user_id for p in valid_profiles if p.user_id}
    default_share = round(100.0 / max(1, len(eligible_users)), 1)

    for u in eligible_users:
        if u.id not in existing_user_ids:
            # Check by name matching if user_id wasn't set previously
            clean_name = format_partner_name(u.email)
            existing_by_name = next((p for p in valid_profiles if is_payer_match(clean_name, p.partner_name)), None)
            if existing_by_name:
                existing_by_name.user_id = u.id
                existing_user_ids.add(u.id)
            else:
                p_id = f"PRT-{secrets.token_hex(2).upper()}"
                new_prof = PartnerProfile(
                    id=p_id,
                    user_id=u.id,
                    partner_name=clean_name,
                    equity_percentage=default_share,
                    initial_investment=0.0,
                    notes="Partner capital account"
                )
                db.add(new_prof)
                valid_profiles.append(new_prof)
                existing_user_ids.add(u.id)

    await db.commit()

    # Attach user_email in memory for payer matching
    for p in valid_profiles:
        matched_u = eligible_user_map.get(p.user_id)
        if matched_u:
            p.user_email = matched_u.email
        else:
            p.user_email = None

    profiles = valid_profiles

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
    eligible_expenses = [
        e for e in expenses 
        if (e.status or '').lower() == 'paid' 
        or (e.payment_logs and isinstance(e.payment_logs, list) and len(e.payment_logs) > 0)
    ]
    operational_exp = 0.0
    for e in eligible_expenses:
        if e.category == 'Inventory Purchase':
            continue
        if e.payment_logs and isinstance(e.payment_logs, list) and len(e.payment_logs) > 0:
            operational_exp += sum(float(l.get('amount', 0.0)) for l in e.payment_logs if isinstance(l, dict))
        else:
            operational_exp += float(e.amount_paid if e.amount_paid is not None else (e.amount if (e.status or '').lower() == 'paid' else 0.0))

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

    # 4. Total dynamic invested across all partners (including partial salary payouts)
    partner_investments = calculate_partner_investments(profiles, eligible_expenses)
    total_dynamic_invested = sum(partner_investments.values())
    estimated_brand_valuation = (net_profit * 5.0) + total_dynamic_invested

    partner_reports: List[PartnerEquityReportItem] = []
    for p in profiles:
        partner_draws = [d for d in all_drawings if d.partner_id == p.id]
        total_withdrawn = sum(d.amount for d in partner_draws)
        profit_share = net_profit * (p.equity_percentage / 100.0)
        partner_inv = partner_investments.get(p.id, 0.0)
        net_capital = (partner_inv + profit_share) - total_withdrawn
        brand_stake = estimated_brand_valuation * (p.equity_percentage / 100.0)

        partner_reports.append(PartnerEquityReportItem(
            id=p.id,
            partner_name=p.partner_name,
            equity_percentage=p.equity_percentage,
            total_invested=partner_inv,
            initial_investment=partner_inv,
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
    eligible_expenses = [
        e for e in expenses 
        if (e.status or '').lower() == 'paid' 
        or (e.payment_logs and isinstance(e.payment_logs, list) and len(e.payment_logs) > 0)
    ]
    operational_exp = 0.0
    for e in eligible_expenses:
        if e.category == 'Inventory Purchase':
            continue
        if e.payment_logs and isinstance(e.payment_logs, list) and len(e.payment_logs) > 0:
            operational_exp += sum(float(l.get('amount', 0.0)) for l in e.payment_logs if isinstance(l, dict))
        else:
            operational_exp += float(e.amount_paid if e.amount_paid is not None else (e.amount if (e.status or '').lower() == 'paid' else 0.0))

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

    # Dynamic invested calculation for this partner
    all_prof_res = await db.execute(select(PartnerProfile))
    all_profs = all_prof_res.scalars().all()
    partner_investments = calculate_partner_investments(all_profs, eligible_expenses)
    partner_inv = partner_investments.get(profile.id, 0.0)

    net_capital = (partner_inv + profit_share) - total_withdrawn

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
        if profile_in.initial_investment is not None and profile_in.initial_investment > 0:
            profile.initial_investment = profile_in.initial_investment
        profile.notes = profile_in.notes
    else:
        p_id = f"PRT-{secrets.token_hex(2).upper()}"
        profile = PartnerProfile(
            id=p_id,
            partner_name=profile_in.partner_name,
            equity_percentage=profile_in.equity_percentage,
            initial_investment=profile_in.initial_investment or 0.0,
            notes=profile_in.notes
        )
        db.add(profile)

    await db.commit()
    invalidate_bootstrap_cache()
    return {"message": "Partner profile updated successfully", "id": profile.id}
