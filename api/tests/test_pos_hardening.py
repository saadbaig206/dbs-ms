import pytest
from httpx import AsyncClient
from datetime import datetime

@pytest.mark.asyncio
async def test_financial_hardening_and_pos_lifecycle(client: AsyncClient):
    # 1. Login as Admin
    admin_login = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "admin"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Login as Staff
    staff_login = await client.post("/api/v1/auth/login", json={
        "email": "staff@gmail.com",
        "password": "staff"
    })
    assert staff_login.status_code == 200
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Test A: Catalog Price Undercutting Protection
    # Create service with price Rs. 10,000
    srv_res = await client.post("/api/v1/services", json={
        "name": "Luxury Laser Facial",
        "category": "Laser Treatments",
        "durationMinutes": 45,
        "price": 10000.0,
        "description": "Premium laser"
    }, headers=admin_headers)
    assert srv_res.status_code == 200
    srv_id = srv_res.json()["id"]

    # Staff attempts to sell at Rs. 5,000 unit price (catalog undercut without admin supervisor)
    undercut_res = await client.post("/api/v1/pos/checkout", json={
        "clientName": "Test Client",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "cartItems": [{
            "serviceId": srv_id,
            "name": "Luxury Laser Facial",
            "price": 5000.0,
            "quantity": 1
        }]
    }, headers=staff_headers)
    assert undercut_res.status_code == 400
    assert "catalog price" in undercut_res.json()["detail"].lower()

    # Test B: Cash Tender & Change Calculation in Checkout
    cash_checkout_res = await client.post("/api/v1/pos/checkout", json={
        "clientName": "Tender Client",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "amountPaid": 10000.0,
        "remainingDue": 0.0,
        "cashReceived": 15000.0,
        "cashReturned": 5000.0,
        "cartItems": [{
            "serviceId": srv_id,
            "name": "Luxury Laser Facial",
            "price": 10000.0,
            "quantity": 1,
            "staffName": "Dr. Sarah"
        }]
    }, headers=admin_headers)
    assert cash_checkout_res.status_code == 200
    cash_txn = cash_checkout_res.json()
    assert cash_txn["cashReceived"] == 15000.0
    assert cash_txn["cashReturned"] == 5000.0
    assert cash_txn["amountPaid"] == 10000.0

    # Test C: Split Payment Validation
    split_res = await client.post("/api/v1/pos/checkout", json={
        "clientName": "Split Client",
        "paymentMethod": "Split",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "amountPaid": 10000.0,
        "remainingDue": 0.0,
        "bankTxnId": "POS-SLIP-9999",
        "paymentSplits": [
            {"method": "Cash", "amount": 6000.0},
            {"method": "Card", "amount": 4000.0}
        ],
        "cartItems": [{
            "serviceId": srv_id,
            "name": "Luxury Laser Facial",
            "price": 10000.0,
            "quantity": 1
        }]
    }, headers=admin_headers)
    assert split_res.status_code == 200
    split_txn = split_res.json()
    assert len(split_txn["paymentSplits"]) == 2

    # Test D: Partial Item Refund
    # Checkout 2 items
    multi_checkout = await client.post("/api/v1/pos/checkout", json={
        "clientName": "Refund Client",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "cartItems": [
            {"serviceId": srv_id, "name": "Luxury Laser Facial", "price": 10000.0, "quantity": 1},
            {"serviceId": "CUSTOM-1", "name": "Skincare Cream", "price": 4000.0, "quantity": 1}
        ]
    }, headers=admin_headers)
    assert multi_checkout.status_code == 200
    multi_txn = multi_checkout.json()
    assert multi_txn["grandTotal"] == 14000.0

    # Partial refund of only the 4000 cream
    partial_ref_res = await client.post(f"/api/v1/pos/transactions/{multi_txn['id']}/refund", json={
        "reason": "Customer returned cream",
        "restockInventory": False,
        "itemsToRefund": [{"name": "Skincare Cream", "price": 4000.0, "quantity": 1}]
    }, headers=admin_headers)
    assert partial_ref_res.status_code == 200
    partial_data = partial_ref_res.json()
    assert partial_data["status"] == "Partial Refund"
    assert partial_data["amountPaid"] == 10000.0

    # Test E: Client Debt Settlement Constraints
    # Create client with outstanding balance
    client_res = await client.post("/api/v1/clients", json={
        "name": "Debtor Client",
        "phone": "+923001234999",
        "cnic": "42101-1234567-9",
        "gender": "Female",
        "age": 28,
        "address": "Lahore"
    }, headers=admin_headers)
    assert client_res.status_code == 200
    debtor_id = client_res.json()["id"]

    # Buy on credit (advance Rs. 2000, due Rs. 8000)
    debt_checkout = await client.post("/api/v1/pos/checkout", json={
        "clientId": debtor_id,
        "clientName": "Debtor Client",
        "paymentMethod": "Cash",
        "discountPercent": 0.0,
        "taxPercent": 0.0,
        "amountPaid": 2000.0,
        "remainingDue": 8000.0,
        "cartItems": [{
            "serviceId": srv_id,
            "name": "Luxury Laser Facial",
            "price": 10000.0,
            "quantity": 1
        }]
    }, headers=admin_headers)
    assert debt_checkout.status_code == 200

    # Overpayment debt settlement attempt (paying Rs. 15,000 when debt is Rs. 8,000)
    overpay_res = await client.post(f"/api/v1/clients/{debtor_id}/settle-dues", json={
        "amount": 15000.0,
        "paymentMethod": "Cash"
    }, headers=staff_headers)
    assert overpay_res.status_code == 400
    assert "exceed" in overpay_res.json()["detail"].lower()

    # Valid exact settlement
    valid_settle = await client.post(f"/api/v1/clients/{debtor_id}/settle-dues", json={
        "amount": 8000.0,
        "paymentMethod": "Cash"
    }, headers=staff_headers)
    assert valid_settle.status_code == 200
    assert valid_settle.json()["outstandingBalance"] == 0.0

    # Test F: Vendor Bill Settlement & Expense Generation
    # Create bill
    bill_res = await client.post("/api/v1/purchases/bills", json={
        "vendorName": "MedSupply Global",
        "date": "2026-09-22",
        "paymentMethod": "Bank Transfer",
        "paymentStatus": "Pending",
        "items": [{
            "itemName": "Botox Vials 100U",
            "category": "Injectables",
            "unitCost": 25000.0,
            "quantity": 2
        }]
    }, headers=admin_headers)
    assert bill_res.status_code == 200
    bill_id = bill_res.json()["id"]
    assert bill_res.json()["remainingDue"] == 50000.0

    # Pay bill Rs. 50,000
    pay_bill_res = await client.post(f"/api/v1/purchases/bills/{bill_id}/pay", json={
        "amount": 50000.0,
        "paymentMethod": "Bank Transfer",
        "notes": "Full vendor settlement"
    }, headers=admin_headers)
    assert pay_bill_res.status_code == 200
    assert pay_bill_res.json()["paymentStatus"] == "Paid"

    # Verify ExpenseItem generated for vendor payment
    exp_res = await client.get("/api/v1/expenses", headers=admin_headers)
    assert exp_res.status_code == 200
    exp_list = exp_res.json()
    assert any("MedSupply Global" in (e.get("title") or "") and e.get("amount") == 50000.0 for e in exp_list)

    # Test G: Appointment Deletion Lockout for Paid Appointments
    apt_res = await client.post("/api/v1/appointments", json={
        "clientId": debtor_id,
        "clientName": "Apt Client",
        "phone": "+923005554433",
        "serviceId": srv_id,
        "serviceName": "Luxury Laser Facial",
        "staffId": "STF-1",
        "staffName": "Dr. Sarah",
        "date": "2026-09-25",
        "time": "02:00 PM",
        "price": 10000.0,
        "transactionId": cash_txn["id"],
        "paymentStatus": "Paid"
    }, headers=staff_headers)
    assert apt_res.status_code == 200
    apt_id = apt_res.json()["id"]

    # Attempt delete paid appointment
    del_apt = await client.delete(f"/api/v1/appointments/{apt_id}", headers=staff_headers)
    assert del_apt.status_code == 400
    assert "billed or linked" in del_apt.json()["detail"].lower()

    # Test H: Partner Equity Over-Allocation Rejection
    p1_res = await client.post("/api/v1/partners/profiles", json={
        "partnerName": "Primary Partner",
        "equityPercentage": 70.0,
        "initialInvestment": 50000.0
    }, headers=admin_headers)
    assert p1_res.status_code == 200

    # Overallocated partner attempt (70% + 40% = 110% > 100%)
    equity_fail = await client.post("/api/v1/partners/profiles", json={
        "partnerName": "Overallocated Partner",
        "equityPercentage": 40.0,
        "initialInvestment": 10000.0
    }, headers=admin_headers)
    assert equity_fail.status_code == 400
    assert "cannot exceed 100%" in equity_fail.json()["detail"].lower()

    # Test I: Auth Hardening (Blank password & random password rejected)
    blank_pass_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "   "
    })
    assert blank_pass_res.status_code == 401

    wrong_pass_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@gmail.com",
        "password": "completely_wrong_password"
    })
    assert wrong_pass_res.status_code == 401

    # Test J: Vendor Return Insufficient Stock Rejection
    rtv_fail = await client.post("/api/v1/returns", json={
        "vendorName": "MedSupply Global",
        "date": "2026-09-22",
        "settlementType": "Deduct_From_Payable",
        "items": [{
            "itemName": "Botox Vials 100U",
            "quantity": 9999,  # Far exceeds stock
            "unitCost": 25000.0
        }]
    }, headers=admin_headers)
    assert rtv_fail.status_code == 400
    assert "stock" in rtv_fail.json()["detail"].lower()

    # Test K: WhatsApp Endpoints Require Staff Authentication
    wa_unauth = await client.get("/api/v1/whatsapp/conversations")
    assert wa_unauth.status_code == 401

    wa_auth = await client.get("/api/v1/whatsapp/conversations", headers=staff_headers)
    assert wa_auth.status_code == 200

    # Test L: Billed Appointment Tampering / Cancellation Lockout
    tamper_apt = await client.put(f"/api/v1/appointments/{apt_id}", json={
        "status": "Cancelled"
    }, headers=staff_headers)
    assert tamper_apt.status_code == 400
    assert "cannot cancel a billed" in tamper_apt.json()["detail"].lower()
