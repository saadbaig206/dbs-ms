import asyncio
from sqlalchemy.future import select
from app.db.session import SessionLocal, engine
from app.models.service import ServiceItem

SERVICES_DATA = [
    # --- LASER TREATMENTS ---
    {
        "id": "SRV-LSR-001",
        "name": "Full Body Laser (Unlimited Sessions)",
        "category": "Laser Treatments",
        "price": 75000,
        "duration_minutes": 120,
        "description": "Full body laser hair removal - unlimited session package.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=500"
    },
    {
        "id": "SRV-LSR-002",
        "name": "Hand & Foot Laser (8 Sessions)",
        "category": "Laser Treatments",
        "price": 35000,
        "duration_minutes": 60,
        "description": "Targeted laser hair removal package for hands and feet.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=500"
    },
    {
        "id": "SRV-LSR-003",
        "name": "Face & Neck Laser (6 Sessions)",
        "category": "Laser Treatments",
        "price": 20000,
        "duration_minutes": 45,
        "description": "6 session laser hair removal package for face and neck.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=500"
    },

    # --- INJECTABLES & ANTI-AGING ---
    {
        "id": "SRV-INJ-001",
        "name": "Full Face & Neck Botox",
        "category": "Injectables & Anti-Aging",
        "price": 60000,
        "duration_minutes": 45,
        "description": "Comprehensive full face and neck botulinum toxin injection.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=500"
    },
    {
        "id": "SRV-INJ-002",
        "name": "Full Face Botox",
        "category": "Injectables & Anti-Aging",
        "price": 50000,
        "duration_minutes": 30,
        "description": "Anti-wrinkle botox treatment targeting major facial areas.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=500"
    },
    {
        "id": "SRV-INJ-003",
        "name": "Single Area Fillers",
        "category": "Injectables & Anti-Aging",
        "price": 25000,
        "duration_minutes": 40,
        "description": "Dermal filler injection for a single area (lips, cheeks, or nasolabial).",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=500"
    },

    # --- REJUVENATION / HI-FU ---
    {
        "id": "SRV-REJ-001",
        "name": "Body HIFU Treatment",
        "category": "Rejuvenation",
        "price": 65000,
        "duration_minutes": 90,
        "description": "High-Intensity Focused Ultrasound for body contouring and tightening.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=500"
    },
    {
        "id": "SRV-REJ-002",
        "name": "Face, Chin & Neck HIFU",
        "category": "Rejuvenation",
        "price": 40000,
        "duration_minutes": 60,
        "description": "HIFU facelift and neck contouring treatment.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=500"
    },

    # --- FACIAL & SKIN CARE ---
    {
        "id": "SRV-FAC-001",
        "name": "Glow Hydra Facial",
        "category": "Facial & Skin Care",
        "price": 10000,
        "duration_minutes": 60,
        "description": "Premium multi-step hydration and glowing facial treatment.",
        "assigned_staff_ids": ["STF-102"],
        "assigned_staff_names": ["Sarah Jenkins"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=500"
    },
    {
        "id": "SRV-FAC-002",
        "name": "Hydra Signature Facial (Cocktail)",
        "category": "Facial & Skin Care",
        "price": 6000,
        "duration_minutes": 45,
        "description": "Signature hydrating facial with vitamin cocktail serums.",
        "assigned_staff_ids": ["STF-102"],
        "assigned_staff_names": ["Sarah Jenkins"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=500"
    },
    {
        "id": "SRV-FAC-003",
        "name": "Hydra Facial Black Beauty",
        "category": "Facial & Skin Care",
        "price": 11000,
        "duration_minutes": 60,
        "description": "Specialized charcoal extraction and deep clarifying Hydra Facial.",
        "assigned_staff_ids": ["STF-102"],
        "assigned_staff_names": ["Sarah Jenkins"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=500"
    },
    {
        "id": "SRV-FAC-004",
        "name": "Vampire Hydra Facial",
        "category": "Facial & Skin Care",
        "price": 12000,
        "duration_minutes": 75,
        "description": "Hydra Facial combined with micro-needling and PRP serum.",
        "assigned_staff_ids": ["STF-101", "STF-102"],
        "assigned_staff_names": ["Dr. Elena Rostova", "Sarah Jenkins"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=500"
    },

    # --- IV THERAPY ---
    {
        "id": "SRV-IVT-001",
        "name": "Skin Whitening Drips (Per Session)",
        "category": "IV Therapy",
        "price": 30000,
        "duration_minutes": 45,
        "description": "Glutathione & Vitamin C skin brightening IV drip.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=500"
    },
    {
        "id": "SRV-IVT-002",
        "name": "Whitening Glutathione (Full Course)",
        "category": "IV Therapy",
        "price": 80000,
        "duration_minutes": 45,
        "description": "Complete multi-session Glutathione whitening IV drip package.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=500"
    },
    {
        "id": "SRV-IVT-003",
        "name": "Slimming Drips (8 Drips Package)",
        "category": "IV Therapy",
        "price": 40000,
        "duration_minutes": 45,
        "description": "Metabolism-boosting and fat-burning slimming IV drip package.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=500"
    },

    # --- PACKAGES ---
    {
        "id": "SRV-PKG-001",
        "name": "Bridal Special Makeover Package",
        "category": "Packages",
        "price": 25000,
        "duration_minutes": 180,
        "description": "Premium full salon bridal makeup and hair styling package.",
        "assigned_staff_ids": ["STF-102"],
        "assigned_staff_names": ["Sarah Jenkins"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=500"
    },
    {
        "id": "SRV-PKG-002",
        "name": "Stemcells Face Rejuvenation Package",
        "category": "Packages",
        "price": 70000,
        "duration_minutes": 90,
        "description": "Full face stemcell therapy and anti-aging serum therapy.",
        "assigned_staff_ids": ["STF-101"],
        "assigned_staff_names": ["Dr. Elena Rostova"],
        "status": "Active",
        "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=500"
    }
]

async def insert_services():
    print("Connecting to database...")
    async with SessionLocal() as db:
        # Check if services already exist to avoid duplicates
        for srv in SERVICES_DATA:
            result = await db.execute(select(ServiceItem).where(ServiceItem.id == srv["id"]))
            existing = result.scalars().first()
            if not existing:
                print(f"Adding service: {srv['name']} ({srv['price']} Rs)")
                db.add(ServiceItem(**srv))
            else:
                print(f"Updating service: {srv['name']}")
                for key, val in srv.items():
                    setattr(existing, key, val)
                db.add(existing)
        
        await db.commit()
    print("Successfully populated services in database!")

if __name__ == "__main__":
    asyncio.run(insert_services())
