import asyncio
import httpx
import re

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def run_audit():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("=== DBS SYSTEM COMPREHENSIVE QA AUDIT ===")

        # 1. AUTHENTICATION & RBAC
        print("\n--- Phase 2: Auth & RBAC ---")
        # Admin Login
        login_res = await client.post("/auth/login", json={"email": "admin@gmail.com", "password": "admin"})
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[PASS] Admin login succeeded.")

        # Staff Login
        staff_login_res = await client.post("/auth/login", json={"email": "staff@gmail.com", "password": "staff"})
        assert staff_login_res.status_code == 200, f"Staff login failed: {staff_login_res.text}"
        staff_token = staff_login_res.json()["access_token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        print("[PASS] Staff login succeeded.")

        # RBAC Check: Staff blocked from viewing transactions
        staff_txn_res = await client.get("/transactions", headers=staff_headers)
        assert staff_txn_res.status_code in (401, 403), f"Staff should be blocked from /transactions, got {staff_txn_res.status_code}"
        print(f"[PASS] Staff blocked from /transactions (Status: {staff_txn_res.status_code}).")

        # RBAC Check: Staff blocked from viewing expenses
        staff_exp_res = await client.get("/expenses", headers=staff_headers)
        assert staff_exp_res.status_code in (401, 403), f"Staff should be blocked from /expenses, got {staff_exp_res.status_code}"
        print(f"[PASS] Staff blocked from /expenses (Status: {staff_exp_res.status_code}).")

        # RBAC Check: Staff blocked from viewing purchases
        staff_pur_res = await client.get("/purchases/bills", headers=staff_headers)
        assert staff_pur_res.status_code in (401, 403), f"Staff should be blocked from /purchases/bills, got {staff_pur_res.status_code}"
        print(f"[PASS] Staff blocked from /purchases/bills (Status: {staff_pur_res.status_code}).")

        # 2. CLIENT MANAGEMENT & DUPLICATE PREVENTION
        print("\n--- Phase 3: Client CRM & Duplicate Phone Check ---")
        client_data = {
            "name": "Dr. Sarah Khan",
            "phone": "03009988776",
            "gender": "Female",
            "age": 29,
            "address": "Gulberg III, Lahore",
            "preferredService": "HydraFacial Deluxe"
        }
        c_res = await client.post("/clients", json=client_data, headers=admin_headers)
        if c_res.status_code == 200:
            sarah_client = c_res.json()
            print(f"[PASS] Client created: {sarah_client['name']} (ID: {sarah_client['id']}, Phone: {sarah_client['phone']})")
        else:
            # Maybe already created in prior run
            list_res = await client.get("/clients?search=03009988776", headers=admin_headers)
            sarah_client = list_res.json()[0]
            print(f"[INFO] Existing client reused: {sarah_client['name']} (ID: {sarah_client['id']})")

        # Test Duplicate with international +92 format
        dup_data = {
            "name": "Sarah Duplicate",
            "phone": "+923009988776",
            "gender": "Female",
            "age": 30
        }
        dup_res = await client.post("/clients", json=dup_data, headers=admin_headers)
        assert dup_res.status_code == 400, f"Duplicate phone should be rejected, got {dup_res.status_code}: {dup_res.text}"
        print(f"[PASS] Cross-format phone duplicate blocked successfully: {dup_res.json()['detail']}")

        # 3. APPOINTMENTS & SCHEDULING CONFLICTS
        print("\n--- Phase 4: Appointments & Conflict Prevention ---")
        staff_list_res = await client.get("/staff", headers=admin_headers)
        staff_members = staff_list_res.json()
        target_staff = staff_members[0]

        services_res = await client.get("/services", headers=admin_headers)
        services_list = services_res.json()
        target_service = services_list[0]

        apt_payload1 = {
            "clientId": sarah_client["id"],
            "clientName": sarah_client["name"],
            "phone": sarah_client["phone"],
            "serviceId": target_service["id"],
            "serviceName": target_service["name"],
            "staffId": target_staff["id"],
            "staffName": target_staff["name"],
            "date": "2026-09-25",
            "time": "02:00 PM",
            "category": "treatment",
            "price": float(target_service["price"]),
            "notes": "First session"
        }
        apt_res1 = await client.post("/appointments", json=apt_payload1, headers=admin_headers)
        assert apt_res1.status_code == 200, f"Appointment 1 failed: {apt_res1.text}"
        apt1 = apt_res1.json()
        print(f"[PASS] Appointment 1 booked: ID {apt1['id']} for {target_staff['name']} at {apt1['time']} on {apt1['date']}")

        # Attempt Double Booking at overlapping time
        apt_payload2 = {
            "clientId": sarah_client["id"],
            "clientName": sarah_client["name"],
            "phone": sarah_client["phone"],
            "serviceId": target_service["id"],
            "serviceName": target_service["name"],
            "staffId": target_staff["id"],
            "staffName": target_staff["name"],
            "date": "2026-09-25",
            "time": "02:15 PM", # Overlaps with 2:00 PM slot (45 min duration)
            "category": "treatment",
            "price": float(target_service["price"])
        }
        apt_res2 = await client.post("/appointments", json=apt_payload2, headers=admin_headers)
        assert apt_res2.status_code == 400, f"Double booking should be blocked! Got {apt_res2.status_code}: {apt_res2.text}"
        print(f"[PASS] Overlapping double booking blocked: {apt_res2.json()['detail']}")

        # 4. INVENTORY & PURCHASES LIFECYCLE
        print("\n--- Phase 5 & 7: Inventory, Purchases & Vendor Ledger ---")
        # Check initial inventory of test item
        inv_list_res = await client.get("/inventory", headers=admin_headers)
        inv_items = inv_list_res.json()
        target_inv = inv_items[0]
        initial_stock = target_inv["quantity"]
        print(f"Target inventory item: '{target_inv['itemName']}', Initial Stock: {initial_stock}")

        # Purchase 20 units of this item from vendor on partial credit
        purchase_payload = {
            "vendorName": "MediDerm Supplies Ltd",
            "billNumber": "BILL-MDS-901",
            "date": "2026-09-23",
            "paymentMethod": "Bank Transfer",
            "paymentStatus": "Partial",
            "amountPaid": 10000.0,
            "items": [
                {
                    "itemName": target_inv["itemName"],
                    "category": target_inv["category"],
                    "unitCost": 1000.0,
                    "quantity": 20,
                    "sellingPrice": target_inv["price"]
                }
            ],
            "notes": "Procured 20 units @ Rs. 1,000 each. Total Rs. 20,000, Paid Rs. 10,000, Due Rs. 10,000"
        }
        pur_res = await client.post("/purchases", json=purchase_payload, headers=admin_headers)
        assert pur_res.status_code == 200, f"Purchase bill creation failed: {pur_res.text}"
        pur_bill = pur_res.json()
        print(f"[PASS] Purchase bill created: {pur_bill['id']}")
        print(f"  Total Amount: Expected Rs. 20,000 | Actual: Rs. {pur_bill['totalAmount']}")
        print(f"  Amount Paid:  Expected Rs. 10,000 | Actual: Rs. {pur_bill['amountPaid']}")
        print(f"  Remaining Due: Expected Rs. 10,000 | Actual: Rs. {pur_bill['remainingDue']}")
        assert pur_bill['totalAmount'] == 20000.0
        assert pur_bill['amountPaid'] == 10000.0
        assert pur_bill['remainingDue'] == 10000.0

        # Verify stock increment
        inv_res_after_pur = await client.get("/inventory", headers=admin_headers)
        updated_inv = [i for i in inv_res_after_pur.json() if i["id"] == target_inv["id"]][0]
        expected_stock_after_pur = initial_stock + 20
        print(f"  Stock after Purchase: Expected {expected_stock_after_pur} | Actual: {updated_inv['quantity']}")
        assert updated_inv["quantity"] == expected_stock_after_pur, f"Stock mismatch: expected {expected_stock_after_pur}, got {updated_inv['quantity']}"

        # Settle remaining vendor debt (Rs. 10,000)
        settle_vendor_payload = {
            "amount": 10000.0,
            "paymentMethod": "Bank Transfer",
            "notes": "Settled remaining balance"
        }
        settle_vendor_res = await client.post(f"/purchases/bills/{pur_bill['id']}/pay", json=settle_vendor_payload, headers=admin_headers)
        assert settle_vendor_res.status_code == 200, f"Vendor settlement failed: {settle_vendor_res.text}"
        settled_bill = settle_vendor_res.json()
        print(f"[PASS] Vendor payable settled: Remaining Due: Expected Rs. 0.0 | Actual: Rs. {settled_bill['remainingDue']}")
        assert settled_bill['remainingDue'] == 0.0
        assert settled_bill['paymentStatus'] == "Paid"

        # 5. POS CHECKOUT & BILLING ENGINE
        print("\n--- Phase 6: POS Checkout, Split Payment & Client Dues ---")
        # Client purchases 2 units of the product
        # Unit price = target_inv['price'], Subtotal = 2 * price
        # Apply 10% discount, Pay partially
        unit_p = float(target_inv['price'])
        cart_subtotal = round(unit_p * 2, 2)
        disc_pct = 10.0
        discount_amt = round((cart_subtotal * disc_pct) / 100.0, 2)
        grand_tot = round(cart_subtotal - discount_amt, 2)
        paid_now = round(grand_tot / 2.0, 2)
        rem_due = round(grand_tot - paid_now, 2)

        pos_payload = {
            "clientName": sarah_client["name"],
            "clientId": sarah_client["id"],
            "clientPhone": sarah_client["phone"],
            "paymentMethod": "Cash",
            "discountPercent": disc_pct,
            "taxPercent": 0.0,
            "amountPaid": paid_now,
            "remainingDue": rem_due,
            "cartItems": [
                {
                    "serviceId": target_inv["id"],
                    "name": target_inv["itemName"],
                    "price": unit_p,
                    "quantity": 2,
                    "category": target_inv["category"],
                    "isProduct": True,
                    "inventoryItemId": target_inv["id"]
                }
            ]
        }
        pos_res = await client.post("/pos/checkout", json=pos_payload, headers=admin_headers)
        assert pos_res.status_code == 200, f"POS Checkout failed: {pos_res.text}"
        pos_txn = pos_res.json()
        print(f"[PASS] POS Transaction created: {pos_txn['id']} (Invoice: {pos_txn['invoiceId']})")
        print(f"  Subtotal:      Expected Rs. {cart_subtotal} | Actual: Rs. {pos_txn['amount']}")
        print(f"  Discount:      Expected Rs. {discount_amt} | Actual: Rs. {pos_txn['discount']}")
        print(f"  Grand Total:   Expected Rs. {grand_tot} | Actual: Rs. {pos_txn['grandTotal']}")
        print(f"  Amount Paid:   Expected Rs. {paid_now} | Actual: Rs. {pos_txn['amountPaid']}")
        print(f"  Remaining Due: Expected Rs. {rem_due} | Actual: Rs. {pos_txn['remainingDue']}")
        assert pos_txn['grandTotal'] == grand_tot
        assert pos_txn['amountPaid'] == paid_now
        assert pos_txn['remainingDue'] == rem_due

        # Verify Inventory decremented by 2
        inv_res_after_pos = await client.get("/inventory", headers=admin_headers)
        inv_after_pos = [i for i in inv_res_after_pos.json() if i["id"] == target_inv["id"]][0]
        expected_stock_after_pos = expected_stock_after_pur - 2
        print(f"  Stock after POS Sale: Expected {expected_stock_after_pos} | Actual: {inv_after_pos['quantity']}")
        assert inv_after_pos["quantity"] == expected_stock_after_pos

        # Verify Client outstanding balance updated
        c_res_after_pos = await client.get(f"/clients?search={sarah_client['phone']}", headers=admin_headers)
        sarah_after_pos = c_res_after_pos.json()[0]
        print(f"  Client Outstanding Due: Expected Rs. {rem_due} | Actual: Rs. {sarah_after_pos['outstandingBalance']}")
        assert round(sarah_after_pos['outstandingBalance'], 2) == rem_due

        # Settle Client Due
        settle_client_payload = {
            "amount": rem_due,
            "paymentMethod": "Cash",
            "notes": "Paid remaining balance at front desk"
        }
        settle_res = await client.post(f"/clients/{sarah_client['id']}/settle-dues", json=settle_client_payload, headers=admin_headers)
        assert settle_res.status_code == 200, f"Client settle due failed: {settle_res.text}"
        c_res_after_settle = await client.get(f"/clients?search={sarah_client['phone']}", headers=admin_headers)
        sarah_after_settle = c_res_after_settle.json()[0]
        print(f"[PASS] Client Due settled: Expected Rs. 0.0 | Actual: Rs. {sarah_after_settle['outstandingBalance']}")
        assert round(sarah_after_settle['outstandingBalance'], 2) == 0.0

        # 6. EXPENSES & PAYROLL
        print("\n--- Phase 8: Clinic Expense & Staff Payroll Sync ---")
        clinic_exp_payload = {
            "title": "Clinic Electricity Bill",
            "category": "Utilities",
            "amount": 25000.0,
            "actualAmount": 25000.0,
            "amountPaid": 25000.0,
            "remainingAmount": 0.0,
            "date": "2026-09-23",
            "status": "Paid",
            "paymentMethod": "Bank Transfer",
            "notes": "LESCO electricity bill payment"
        }
        exp_res = await client.post("/expenses", json=clinic_exp_payload, headers=admin_headers)
        assert exp_res.status_code == 200, f"Expense creation failed: {exp_res.text}"
        exp_item = exp_res.json()
        print(f"[PASS] Utility expense logged: {exp_item['id']} (Amount: Rs. {exp_item['amount']})")

        # 7. DASHBOARD & FINANCIAL RECONCILIATION
        print("\n--- Phase 11: Reconciliation & Ledger Audit ---")
        db_aggregates = await client.get("/dashboard", headers=admin_headers)
        assert db_aggregates.status_code == 200
        agg_data = db_aggregates.json()
        print(f"Dashboard Aggregates: Total Revenue = Rs. {agg_data['totalRevenue']}, Active Staff = {agg_data['activeStaffCount']}, Clients = {agg_data['totalClients']}")

        print("\n=== ALL SYSTEM AUDIT TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(run_audit())
