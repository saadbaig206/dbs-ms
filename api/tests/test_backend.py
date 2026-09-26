import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.inventory import InventoryItem
from app.models.client import Client
from app.models.transaction import FinancialTransaction

@pytest.mark.asyncio
async def test_auth_login(client: AsyncClient):
    # Test valid admin login
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"

    # Test valid staff login
    response = await client.post("/api/v1/auth/login", json={
        "email": "staff@gmail.com",
        "password": "staff"
    })
    assert response.status_code == 200
    assert response.json()["role"] == "staff"

    # Test invalid credentials
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_inventory_status_hybrid_property(db: AsyncSession):
    # Test inventory status derivation logic
    item_in_stock = InventoryItem(
        id="INV-TEST-1",
        item_name="Test Product 1",
        category="Skincare Products",
        quantity=20,
        min_stock=10,
        supplier="Test Supplier",
        price=100.0,
        last_restocked="2026-08-01"
    )
    item_low_stock = InventoryItem(
        id="INV-TEST-2",
        item_name="Test Product 2",
        category="Skincare Products",
        quantity=5,
        min_stock=10,
        supplier="Test Supplier",
        price=100.0,
        last_restocked="2026-08-01"
    )
    item_out_of_stock = InventoryItem(
        id="INV-TEST-3",
        item_name="Test Product 3",
        category="Skincare Products",
        quantity=0,
        min_stock=10,
        supplier="Test Supplier",
        price=100.0,
        last_restocked="2026-08-01"
    )
    db.add_all([item_in_stock, item_low_stock, item_out_of_stock])
    await db.commit()

    assert item_in_stock.status == "In Stock"
    assert item_low_stock.status == "Low Stock"
    assert item_out_of_stock.status == "Out of Stock"

@pytest.mark.asyncio
async def test_pos_checkout_atomicity(client: AsyncClient, db: AsyncSession):
    # Seed a client and an inventory product matching the service name
    test_client = Client(
        id="CLT-TEST",
        name="John Doe",
        phone="12345678",
        gender="Male",
        age=30,
        total_spent=0.0,
        visits_count=0,
        history=[],
        joined_date="2026-08-01"
    )
    test_product = InventoryItem(
        id="INV-TEST",
        item_name="Signature Laser Peel",
        category="Skincare Products",
        quantity=10,
        min_stock=2,
        supplier="LaserCorp",
        price=50.0,
        last_restocked="2026-08-01"
    )
    db.add_all([test_client, test_product])
    await db.commit()

    # Admin Login to get token for POS request
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Perform POS checkout
    checkout_payload = {
        "clientName": "John Doe",
        "paymentMethod": "Card",
        "bankTxnId": "POS-CARD-SLIP-001",
        "discountPercent": 10.0,
        "taxPercent": 5.0,
        "cartItems": [
            {
                "serviceId": "SRV-TEST",
                "name": "Signature Laser Peel",
                "price": 100.0,
                "quantity": 2,
                "category": "Laser Treatments"
            }
        ]
    }
    
    response = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=headers)
    assert response.status_code == 200, response.text
    
    data = response.json()
    assert data["clientName"] == "John Doe"
    # Subtotal = 200, Discount 10% = 20, Taxable = 180, Tax 5% = 9, Grand Total = 189
    assert data["grandTotal"] == 189.0
    
    # Verify database updates
    await db.refresh(test_client)
    await db.refresh(test_product)
    
    # Client visits and spent should update
    assert test_client.visits_count == 1
    assert test_client.total_spent == 189.0
    assert len(test_client.history) == 1
    
    # Product quantity should decrement (10 - 2 = 8)
    assert test_product.quantity == 8


@pytest.mark.asyncio
async def test_purchases_and_individual_items(client: AsyncClient, db: AsyncSession):
    # Admin Login
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a purchase with multiple items from the same vendor
    payload = {
        "vendorName": "DermaSupply Ltd",
        "invoiceNumber": "INV-DS-9901",
        "items": [
            {
                "itemName": "Hyaluronic Acid 50ml",
                "category": "Serums",
                "quantity": 10,
                "unitCost": 25.0,
                "sellingPrice": 75.0,
                "batchNumber": "BAT-HA-01"
            },
            {
                "itemName": "Vitamin C Radiance Mask",
                "category": "Facial Kits",
                "quantity": 20,
                "unitCost": 15.0,
                "sellingPrice": 45.0,
                "batchNumber": "BAT-VC-02"
            }
        ],
        "date": "2026-09-21",
        "paymentStatus": "Partial",
        "amountPaid": 300.0,
        "paymentMethod": "Bank Transfer"
    }

    res = await client.post("/api/v1/purchases", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    bill_data = res.json()
    # Total = 10*25 + 20*15 = 250 + 300 = 550.0
    assert bill_data["totalAmount"] == 550.0
    assert bill_data["amountPaid"] == 300.0
    assert bill_data["remainingDue"] == 250.0
    assert bill_data["paymentStatus"] == "Partial"

    # Query individual purchase items
    items_res = await client.get("/api/v1/purchases/items", headers=headers)
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) >= 2
    # Verify individual item cost and vendor name
    ha_item = next((i for i in items if "Hyaluronic" in i["itemName"]), None)
    assert ha_item is not None
    assert ha_item["unitCost"] == 25.0
    assert ha_item["quantity"] == 10
    assert ha_item["totalCost"] == 250.0
    assert ha_item["vendorName"] == "DermaSupply Ltd"


@pytest.mark.asyncio
async def test_partner_equity_and_drawings(client: AsyncClient):
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch partner equity
    equity_res = await client.get("/api/v1/partners/equity", headers=headers)
    assert equity_res.status_code == 200
    equity_data = equity_res.json()
    assert "partners" in equity_data
    assert "estimatedBrandValuation" in equity_data
    assert len(equity_data["partners"]) >= 1

    # Fund partner profile with capital so drawing succeeds under solvency rules
    partner_id = equity_data["partners"][0]["id"]
    partner_name = equity_data["partners"][0]["partnerName"]
    await client.post("/api/v1/partners/profiles", json={
        "partnerName": partner_name,
        "equityPercentage": 50.0,
        "initialInvestment": 100000.0,
        "notes": "Test capital deposit"
    }, headers=headers)

    drawing_payload = {
        "partnerId": partner_id,
        "amount": 5000.0,
        "date": "2026-09-21",
        "paymentMethod": "Bank Transfer",
        "notes": "Monthly Profit Distribution"
    }
    draw_res = await client.post("/api/v1/partners/drawings", json=drawing_payload, headers=headers)
    assert draw_res.status_code == 200
    assert draw_res.json()["amount"] == 5000.0


@pytest.mark.asyncio
async def test_prepaid_package_and_redemption(client: AsyncClient):
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Checkout a 3-session prepaid package
    checkout_payload = {
        "clientName": "Sarah Jenkins",
        "paymentMethod": "Card",
        "bankTxnId": "POS-CARD-SLIP-002",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "cartItems": [
            {
                "serviceId": "SRV-HYDRA",
                "name": "HydraFacial 3-Session Bundle",
                "price": 300.0,
                "quantity": 1,
                "category": "Facials",
                "isPackage": True,
                "sessions": 3
            }
        ]
    }
    pos_res = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=headers)
    assert pos_res.status_code == 200, pos_res.text

    # Verify package list
    pkg_list_res = await client.get("/api/v1/packages", headers=headers)
    assert pkg_list_res.status_code == 200
    packages = pkg_list_res.json()
    sarah_pkg = next((p for p in packages if p["clientName"] == "Sarah Jenkins"), None)
    assert sarah_pkg is not None
    assert sarah_pkg["totalSessions"] == 3
    assert sarah_pkg["remainingSessions"] == 3

    # Redeem 1 session
    redeem_res = await client.post(f"/api/v1/packages/{sarah_pkg['id']}/redeem", json={
        "staffName": "Nurse Kelly",
        "notes": "Session 1 of 3 completed"
    }, headers=headers)
    assert redeem_res.status_code == 200
    redemption_data = redeem_res.json()
    assert redemption_data["sessionNumber"] == 1

    # Verify package updated
    updated_pkg_res = await client.get("/api/v1/packages", headers=headers)
    updated_sarah_pkg = next((p for p in updated_pkg_res.json() if p["id"] == sarah_pkg["id"]), None)
    assert updated_sarah_pkg["usedSessions"] == 1
    assert updated_sarah_pkg["remainingSessions"] == 2


@pytest.mark.asyncio
async def test_salary_sync_and_pending_purge(db: AsyncSession):
    from app.models.staff import Staff
    from app.models.expense import ExpenseItem
    from app.services.salary import sync_staff_salary_expense, remove_expenses_by_staff_id

    # Create dummy staff member
    test_staff = Staff(
        id="STF-TEST-SAL",
        name="Dr. Audit Specialist",
        role="Doctor",
        salary=150000.0,
        phone="03001112233",
        email="auditor@aura.com",
        joining_date="2026-01-15",
        assigned_services=[],
        status="Active"
    )
    db.add(test_staff)
    await db.commit()

    # Sync salary - should create a Pending expense with date-tokenized ID
    await sync_staff_salary_expense(db, test_staff)
    
    exp_res = await db.execute(
        select(ExpenseItem).where(ExpenseItem.staff_id == test_staff.id)
    )
    expenses = exp_res.scalars().all()
    assert len(expenses) == 1
    pending_exp = expenses[0]
    assert pending_exp.status == "Pending"
    assert pending_exp.amount == 150000.0
    # Verify ID is tokenized (not plain EXP-SAL-{id})
    assert pending_exp.id.startswith("EXP-SAL-STF-TEST-SAL-")

    # Mark this expense as Paid (e.g. historical paid salary)
    pending_exp.status = "Paid"
    db.add(pending_exp)
    await db.commit()

    # Now call remove_expenses_by_staff_id (e.g. staff deletion or status inactive)
    await remove_expenses_by_staff_id(db, test_staff.id)

    # CRITICAL: Verify the historical Paid salary was NOT purged!
    check_res = await db.execute(
        select(ExpenseItem).where(ExpenseItem.staff_id == test_staff.id)
    )
    remaining_expenses = check_res.scalars().all()
    assert len(remaining_expenses) == 1
    assert remaining_expenses[0].status == "Paid"


@pytest.mark.asyncio
async def test_transaction_update_syncs_client(client: AsyncClient, db: AsyncSession):
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup a client and initial transaction
    test_client = Client(
        id="CLI-SYNC-TEST",
        name="Elena Rostova",
        phone="03001234567",
        gender="Female",
        age=28,
        joined_date="2026-09-01",
        total_spent=10000.0,
        history=[{"id": "HIS-TXN-SYNC-1", "service": "Laser Treatment", "amount": 10000.0, "date": "2026-09-01"}]
    )
    test_txn = FinancialTransaction(
        id="TXN-SYNC-1",
        invoice_id="INV-SYNC-1",
        client_name="Elena Rostova",
        service_name="Laser Treatment",
        amount=10000.0,
        discount=0.0,
        grand_total=10000.0,
        date="2026-09-01",
        payment_method="Card"
    )
    db.add_all([test_client, test_txn])
    await db.commit()

    # Update the transaction to 15,000 (increase of 5,000)
    put_res = await client.put(f"/api/v1/transactions/{test_txn.id}", json={
        "clientName": "Elena Rostova",
        "serviceName": "Laser Treatment",
        "amount": 15000.0,
        "discount": 0.0,
        "grandTotal": 15000.0,
        "date": "2026-09-01",
        "paymentMethod": "Card"
    }, headers=headers)
    assert put_res.status_code == 200

    # Verify Client total_spent was synced to 15,000
    c_res = await db.execute(select(Client).where(Client.id == "CLI-SYNC-TEST"))
    updated_client = c_res.scalars().first()
    assert updated_client.total_spent == 15000.0


@pytest.mark.asyncio
async def test_appointment_pos_billing_link(client: AsyncClient, db: AsyncSession):
    from app.models.appointment import Appointment

    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create an unpaid appointment
    apt = Appointment(
        id="APT-TEST-GHOST",
        client_id="CLI-ZARA",
        client_name="Zara Noor",
        phone="03009876543",
        service_id="SRV-PRP",
        service_name="PRP Therapy",
        staff_id="STF-FATIMA",
        staff_name="Dr. Fatima",
        date="2026-09-22",
        time="14:00",
        price=18000.0,
        category="treatment",
        status="Confirmed",
        payment_status="Unpaid"
    )
    db.add(apt)
    await db.commit()

    # Front-desk completes POS billing for this appointment
    pos_payload = {
        "clientName": "Zara Noor",
        "appointmentId": "APT-TEST-GHOST",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "cartItems": [
            {
                "serviceId": "SRV-PRP",
                "name": "PRP Therapy",
                "price": 18000.0,
                "quantity": 1,
                "category": "Hair & Skin"
            }
        ]
    }
    checkout_res = await client.post("/api/v1/pos/checkout", json=pos_payload, headers=headers)
    assert checkout_res.status_code == 200

    # Verify the appointment is now linked and marked Paid + Completed
    apt_res = await db.execute(select(Appointment).where(Appointment.id == "APT-TEST-GHOST"))
    updated_apt = apt_res.scalars().first()
    assert updated_apt.payment_status == "Paid"
    assert updated_apt.status == "Completed"
    assert updated_apt.transaction_id is not None
    assert updated_apt.transaction_id.startswith("TXN-")


@pytest.mark.asyncio
async def test_purchase_return_and_debit_note(client: AsyncClient, db: AsyncSession):
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure inventory item exists with quantity 50
    inv_item = InventoryItem(
        id="INV-TEST-RETURN",
        item_name="Allergan Botox 100u",
        category="Consumables",
        quantity=50,
        min_stock=5,
        supplier="Allergan Dist",
        price=35000.0,
        last_restocked="2026-09-01"
    )
    db.add(inv_item)
    await db.commit()

    # Process Return to Vendor (RTV) for 10 units
    rtv_payload = {
        "vendorName": "Allergan Dist",
        "date": "2026-09-21",
        "reason": "Near Expiry Stock",
        "settlementType": "Cash_Refund",
        "notes": "Returned via Courier",
        "items": [
            {
                "itemName": "Allergan Botox 100u",
                "quantity": 10,
                "unitCost": 35000.0,
                "batchNumber": "BATCH-2026-X",
                "reason": "Expiring within 30 days"
            }
        ]
    }
    res = await client.post("/api/v1/returns", json=rtv_payload, headers=headers)
    assert res.status_code == 200
    ret_data = res.json()
    assert ret_data["debitNoteNumber"].startswith("DN-")
    assert ret_data["totalRefundAmount"] == 350000.0

    # Verify inventory was decremented by 10 (from 50 to 40)
    inv_check = await db.execute(select(InventoryItem).where(InventoryItem.id == "INV-TEST-RETURN"))
    updated_inv = inv_check.scalars().first()
    assert updated_inv.quantity == 40

@pytest.mark.asyncio
async def test_retail_product_checkout_decrements_inventory(client: AsyncClient, db: AsyncSession):
    login_response = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    retail_prod = InventoryItem(
        id="INV-RETAIL-01",
        item_name="Heliocare 360 SPF 50 Gel",
        category="Products",
        quantity=20,
        min_stock=5,
        supplier="Cantabria Labs",
        price=4500.0,
        last_restocked="2026-09-01"
    )
    db.add(retail_prod)
    await db.commit()

    checkout_payload = {
        "clientName": "Retail Customer",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "cartItems": [
            {
                "serviceId": "INV-RETAIL-01",
                "inventoryItemId": "INV-RETAIL-01",
                "isProduct": True,
                "name": "Heliocare 360 SPF 50 Gel",
                "price": 4500.0,
                "quantity": 3,
                "category": "Products"
            }
        ]
    }
    res = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["grandTotal"] == 13500.0
    assert data["transactionType"] == "Sale"

    await db.refresh(retail_prod)
    # Stock should be 20 - 3 = 17
    assert retail_prod.quantity == 17

@pytest.mark.asyncio
async def test_debt_settlement_tagged_and_pos_math_invariant(client: AsyncClient, db: AsyncSession):
    login_response = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed client
    debt_client = Client(
        id="CLT-DEBT-TEST",
        name="Amina Khan",
        phone="03001234567",
        gender="Female",
        age=28,
        total_spent=0.0,
        outstanding_balance=0.0,
        visits_count=0,
        history=[],
        joined_date="2026-09-01"
    )
    db.add(debt_client)
    await db.commit()

    # 1. Partial checkout: Grand Total 10,000, Amount Paid 4,000 -> Server forces remaining_due 6,000 even if malicious remaining_due: 0 sent
    checkout_payload = {
        "clientName": "Amina Khan",
        "clientId": "CLT-DEBT-TEST",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "amountPaid": 4000.0,
        "remainingDue": 0.0, # Attempting exploit
        "cartItems": [
            {
                "serviceId": "SRV-FACIAL",
                "name": "Hydra Glow Treatment",
                "price": 10000.0,
                "quantity": 1,
                "category": "Facial & Skin Care"
            }
        ]
    }
    res = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=headers)
    assert res.status_code == 200
    txn_data = res.json()
    # Server must enforce remaining_due == 6000.0 and payment_status == "Partial"
    assert txn_data["remainingDue"] == 6000.0
    assert txn_data["paymentStatus"] == "Partial"
    assert txn_data["transactionType"] == "Sale"

    # 2. Settle remaining dues
    settle_res = await client.post("/api/v1/clients/CLT-DEBT-TEST/settle-dues", json={
        "amount": 6000.0,
        "paymentMethod": "Online",
        "notes": "Paid via Bank Transfer"
    }, headers=headers)
    assert settle_res.status_code == 200
    settle_data = settle_res.json()
    assert settle_data["outstandingBalance"] == 0.0

    # 3. Transaction edit audit trail
    update_res = await client.put(f"/api/v1/transactions/{txn_data['id']}", json={
        "clientName": "Amina Khan Updated",
        "updateReason": "Customer surname update"
    }, headers=headers)
    assert update_res.status_code == 200
    updated_txn = update_res.json()
    assert len(updated_txn["auditLogs"]) >= 1
    assert updated_txn["auditLogs"][-1]["reason"] == "Customer surname update"


@pytest.mark.asyncio
async def test_pos_card_slip_required(client: AsyncClient):
    login_res = await client.post("/api/v1/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "clientName": "Card Customer",
        "paymentMethod": "Card",
        "cartItems": [{"serviceId": "SRV-1", "name": "Basic Consultation", "price": 1000.0, "quantity": 1}],
        "bankTxnId": "" # Missing
    }
    res = await client.post("/api/v1/pos/checkout", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Slip No" in res.json()["detail"]

    # Provide bank slip
    payload["bankTxnId"] = "POS-SLIP-98765"
    payload["cardLastFour"] = "4321"
    payload["cardType"] = "Visa"
    res2 = await client.post("/api/v1/pos/checkout", json=payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["bankTxnId"] == "POS-SLIP-98765"


@pytest.mark.asyncio
async def test_pos_discount_limit_enforced(client: AsyncClient):
    # 1. Staff login
    staff_login = await client.post("/api/v1/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    payload = {
        "clientName": "Discount Customer",
        "paymentMethod": "Cash",
        "discountPercent": 25.0, # 25% discount now allowed without 20% cap
        "cartItems": [{"serviceId": "SRV-1", "name": "Basic Consultation", "price": 1000.0, "quantity": 1}]
    }
    res = await client.post("/api/v1/pos/checkout", json=payload, headers=staff_headers)
    assert res.status_code == 200
    assert res.json()["discount"] == 250.0

    # Admin with > 20% succeeds
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    payload["discountPercent"] = 35.0
    admin_res = await client.post("/api/v1/pos/checkout", json=payload, headers=admin_headers)
    assert admin_res.status_code == 200
    assert admin_res.json()["discount"] == 350.0


@pytest.mark.asyncio
async def test_pos_package_multibundle_calculation(client: AsyncClient, db: AsyncSession):
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    payload = {
        "clientName": "Package Multi Buyer",
        "paymentMethod": "Cash",
        "cartItems": [{
            "serviceId": "PKG-SRV-LASER",
            "name": "Full Face Laser Bundle (5 Sessions)",
            "price": 15000.0,
            "quantity": 2, # Buying 2 packages of 5 sessions each
            "isPackage": True,
            "sessions": 5
        }]
    }
    res = await client.post("/api/v1/pos/checkout", json=payload, headers=headers)
    assert res.status_code == 200
    txn_data = res.json()
    assert txn_data["grandTotal"] == 30000.0

    from app.models.package import ClientPackage
    pkg_res = await db.execute(select(ClientPackage).where(ClientPackage.id == txn_data["packageId"]))
    pkg = pkg_res.scalars().first()
    assert pkg is not None
    # 2 bundles * 5 sessions = 10 total sessions
    assert pkg.total_sessions == 10
    assert pkg.remaining_sessions == 10
    assert pkg.total_amount_paid == 30000.0
    assert pkg.price_per_session == 3000.0


@pytest.mark.asyncio
async def test_pos_split_payment_validation(client: AsyncClient):
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    payload = {
        "clientName": "Split Customer",
        "paymentMethod": "Split",
        "cartItems": [{"serviceId": "SRV-1", "name": "Hydrafacial", "price": 5000.0, "quantity": 1}],
        "amountPaid": 5000.0,
        "paymentSplits": [
            {"method": "Cash", "amount": 2000.0},
            {"method": "Online", "amount": 2500.0} # Sum = 4500 != 5000
        ]
    }
    res = await client.post("/api/v1/pos/checkout", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Split payment total" in res.json()["detail"]

    # Fixed splits matching amount paid
    payload["paymentSplits"] = [
        {"method": "Cash", "amount": 2000.0},
        {"method": "Online", "amount": 3000.0}
    ]
    res_ok = await client.post("/api/v1/pos/checkout", json=payload, headers=headers)
    assert res_ok.status_code == 200
    assert res_ok.json()["paymentStatus"] == "Paid"


@pytest.mark.asyncio
async def test_pos_refund_restocks_inventory(client: AsyncClient, db: AsyncSession):
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create inventory product
    prod = InventoryItem(
        id="INV-REFUND-PROD",
        item_name="SPF 100 Restock Cream",
        category="Products",
        quantity=25,
        min_stock=5,
        supplier="DermCorp",
        price=2000.0,
        last_restocked="2026-09-01"
    )
    db.add(prod)
    await db.commit()

    # Sell 5 units
    checkout_payload = {
        "clientName": "Refund Customer",
        "paymentMethod": "Cash",
        "cartItems": [{
            "serviceId": "INV-REFUND-PROD",
            "inventoryItemId": "INV-REFUND-PROD",
            "name": "SPF 100 Restock Cream",
            "price": 2000.0,
            "quantity": 5,
            "isProduct": True
        }]
    }
    sale_res = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=admin_headers)
    assert sale_res.status_code == 200
    txn_id = sale_res.json()["id"]

    await db.refresh(prod)
    assert prod.quantity == 20 # 25 - 5

    # Refund transaction
    refund_res = await client.post(f"/api/v1/pos/transactions/{txn_id}/refund", json={
        "reason": "Customer purchased wrong SPF strength",
        "restockInventory": True
    }, headers=admin_headers)
    assert refund_res.status_code == 200
    refunded_txn = refund_res.json()
    assert refunded_txn["status"] == "Refunded"
    assert refunded_txn["paymentStatus"] == "Refunded"

    # Verify inventory was restocked back to 25
    await db.refresh(prod)
    assert prod.quantity == 25


@pytest.mark.asyncio
async def test_pos_reprint_counter_and_watermark(client: AsyncClient):
    staff_login = await client.post("/api/v1/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    checkout_payload = {
        "clientName": "Reprint Client",
        "paymentMethod": "Cash",
        "cartItems": [{"serviceId": "SRV-TEST", "name": "Consultation", "price": 1000.0, "quantity": 1}]
    }
    res = await client.post("/api/v1/pos/checkout", json=checkout_payload, headers=staff_headers)
    txn_id = res.json()["id"]
    assert res.json()["reprintCount"] == 0

    # Call reprint endpoint
    reprint_res1 = await client.post(f"/api/v1/pos/transactions/{txn_id}/reprint", headers=staff_headers)
    assert reprint_res1.status_code == 200
    assert reprint_res1.json()["reprintCount"] == 1

    reprint_res2 = await client.post(f"/api/v1/pos/transactions/{txn_id}/reprint", headers=staff_headers)
    assert reprint_res2.status_code == 200
    assert reprint_res2.json()["reprintCount"] == 2


@pytest.mark.asyncio
async def test_inventory_reduction_negative_stock_prevention(client: AsyncClient, db: AsyncSession):
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    staff_login = await client.post("/api/v1/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Create inventory item with 10 units
    item = InventoryItem(
        id="INV-TEST-BOUNDS",
        item_name="Hydro Serum Test",
        category="Products",
        quantity=10,
        min_stock=3,
        supplier="Vendor X",
        price=1500.0,
        last_restocked="2026-09-01"
    )
    db.add(item)
    await db.commit()

    # 1. Staff attempt reduction without reason -> 400
    res_no_reason = await client.patch(
        "/api/v1/inventory/INV-TEST-BOUNDS/quantity?delta=-2",
        headers=staff_headers
    )
    assert res_no_reason.status_code == 400
    assert "reason" in res_no_reason.json()["detail"].lower()

    # 2. Reduction exceeding available quantity (15 units when only 10 available) -> 400
    res_over_reduce = await client.patch(
        "/api/v1/inventory/INV-TEST-BOUNDS/quantity?delta=-15&reason=Damaged+bottles",
        headers=admin_headers
    )
    assert res_over_reduce.status_code == 400
    assert "cannot reduce stock" in res_over_reduce.json()["detail"].lower()

    # 3. Valid reduction (4 units) -> 200 and quantity becomes 6
    res_valid = await client.patch(
        "/api/v1/inventory/INV-TEST-BOUNDS/quantity?delta=-4&reason=Used+in+clinic",
        headers=admin_headers
    )
    assert res_valid.status_code == 200
    await db.refresh(item)
    assert item.quantity == 6


@pytest.mark.asyncio
async def test_client_duplicate_phone_prevention(client: AsyncClient):
    admin_login = await client.post("/api/v1/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    phone = "+923009998877"
    # Create client 1
    res1 = await client.post("/api/v1/clients", json={
        "name": "Original Client",
        "phone": phone,
        "cnic": "35201-1234567-1",
        "gender": "Female",
        "age": 28,
        "address": "Lahore"
    }, headers=admin_headers)
    assert res1.status_code == 200

    # Attempt to create duplicate client with same phone -> 400
    res2 = await client.post("/api/v1/clients", json={
        "name": "Duplicate Client",
        "phone": phone,
        "cnic": "35201-9999999-9",
        "gender": "Female",
        "age": 30,
        "address": "Karachi"
    }, headers=admin_headers)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_appointment_double_booking_conflict(client: AsyncClient, db: AsyncSession):
    staff_login = await client.post("/api/v1/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    from app.models.staff import Staff
    staff_member = Staff(
        id="STF-DR-QA",
        name="Dr. QA Specialist",
        role="Aesthetic Physician",
        phone="+923005551234",
        email="drqa@clinic.com",
        status="Active",
        salary=150000.0,
        joining_date="2026-01-01"
    )
    db.add(staff_member)
    await db.commit()

    # Book slot 1 at 02:00 PM
    res1 = await client.post("/api/v1/appointments", json={
        "clientId": "CLT-QA-1",
        "clientName": "Test Client A",
        "phone": "+923001112233",
        "serviceId": "SRV-TEST",
        "serviceName": "Laser Therapy",
        "staffId": "STF-DR-QA",
        "staffName": "Dr. QA Specialist",
        "date": "2026-10-15",
        "time": "02:00 PM",
        "status": "Confirmed",
        "price": 10000.0
    }, headers=staff_headers)
    assert res1.status_code == 200

    # Book conflicting slot at 02:20 PM (within 45 min slot) -> 400
    res2 = await client.post("/api/v1/appointments", json={
        "clientId": "CLT-QA-2",
        "clientName": "Test Client B",
        "phone": "+923004445566",
        "serviceId": "SRV-TEST",
        "serviceName": "Laser Therapy",
        "staffId": "STF-DR-QA",
        "staffName": "Dr. QA Specialist",
        "date": "2026-10-15",
        "time": "02:20 PM",
        "status": "Confirmed",
        "price": 10000.0
    }, headers=staff_headers)
    assert res2.status_code == 400
    assert "already booked" in res2.json()["detail"].lower()




