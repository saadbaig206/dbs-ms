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
    assert response.status_code == 200
    
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
