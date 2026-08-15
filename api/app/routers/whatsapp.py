import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.db.session import get_db
from app.models.whatsapp import WhatsAppConversation, WhatsAppMessage, WhatsAppSettings
from app.services.groq_service import GroqService
from app.services.whatsapp_service import WhatsAppService
from app.core.config import settings

router = APIRouter()

# Pydantic Schemas for Router Input/Output
class ConversationUpdate(BaseModel):
    mode: str  # 'agent' or 'human'

class MessageSend(BaseModel):
    message: str

class SettingsUpdate(BaseModel):
    system_prompt: str
    knowledge_base: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    whatsapp_msg_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    mode: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Webhook Verification (GET) ---
@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge")
):
    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        print("Webhook verified successfully.")
        return Response(content=challenge, media_type="text/plain")
    else:
        print("Webhook verification failed.")
        raise HTTPException(status_code=403, detail="Verification token mismatch")

# --- Background Task to Handle Incoming Webhook Message ---
async def process_incoming_message(payload: dict, db: AsyncSession):
    try:
        entry = payload.get("entry", [])
        if not entry:
            return
        changes = entry[0].get("changes", [])
        if not changes:
            return
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return

        msg = messages[0]
        from_phone = msg.get("from")
        msg_body = msg.get("text", {}).get("body", "")
        whatsapp_msg_id = msg.get("id")
        
        # Extract contact name
        contact_name = None
        contacts = value.get("contacts", [])
        if contacts:
            contact_name = contacts[0].get("profile", {}).get("name")

        if not from_phone or not msg_body:
            return

        # Find or create Conversation
        stmt = select(WhatsAppConversation).where(WhatsAppConversation.phone == from_phone)
        result = await db.execute(stmt)
        conversation = result.scalars().first()

        if not conversation:
            conversation = WhatsAppConversation(
                id=uuid.uuid4().hex,
                phone=from_phone,
                name=contact_name or from_phone,
                mode="agent"
            )
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
        else:
            if contact_name and not conversation.name:
                conversation.name = contact_name
            conversation.updated_at = datetime.utcnow()
            db.add(conversation)
            await db.commit()

        # Save incoming User message
        user_message = WhatsAppMessage(
            id=uuid.uuid4().hex,
            conversation_id=conversation.id,
            role="user",
            content=msg_body,
            whatsapp_msg_id=whatsapp_msg_id
        )
        db.add(user_message)
        await db.commit()

        # If agent mode, trigger AI reply
        if conversation.mode == "agent":
            # Fetch settings
            settings_stmt = select(WhatsAppSettings).where(WhatsAppSettings.id == 1)
            settings_res = await db.execute(settings_stmt)
            whatsapp_settings = settings_res.scalars().first()

            system_prompt = "You are a helpful customer service assistant for DBS Aesthetics Clinic."
            knowledge_base = ""
            if whatsapp_settings:
                system_prompt = whatsapp_settings.system_prompt or system_prompt
                knowledge_base = whatsapp_settings.knowledge_base or knowledge_base

            # Fetch last 10 messages for history
            history_stmt = (
                select(WhatsAppMessage)
                .where(WhatsAppMessage.conversation_id == conversation.id)
                .order_by(WhatsAppMessage.created_at.desc())
                .limit(10)
            )
            history_res = await db.execute(history_stmt)
            history_messages = reversed(history_res.scalars().all())
            
            history_list = []
            for h_msg in history_messages:
                history_list.append({
                    "role": h_msg.role,
                    "content": h_msg.content
                })

            # Get AI reply
            ai_reply = await GroqService.get_reply(history_list, system_prompt, knowledge_base)

            # Send WhatsApp message
            sent = await WhatsAppService.send_message(from_phone, ai_reply)

            # Save assistant message
            assistant_message = WhatsAppMessage(
                id=uuid.uuid4().hex,
                conversation_id=conversation.id,
                role="assistant",
                content=ai_reply
            )
            db.add(assistant_message)
            await db.commit()

    except Exception as e:
        print(f"Error processing webhook: {e}")

# --- Webhook Callback (POST) ---
@router.post("/webhook")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = await request.json()
        print(f"Received webhook: {payload}")
        
        # Meta sends delivery/read receipts which don't have text messages
        entry = payload.get("entry", [])
        if entry:
            changes = entry[0].get("changes", [])
            if changes:
                value = changes[0].get("value", {})
                if "messages" in value:
                    # Trigger background processing to reply quickly with 200 OK
                    background_tasks.add_task(process_incoming_message, payload, db)
                    
        return {"status": "event_received"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# --- List Conversations (GET) ---
@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppConversation).order_by(desc(WhatsAppConversation.updated_at))
    result = await db.execute(stmt)
    return result.scalars().all()

# --- Get Messages for Conversation (GET) ---
@router.get("/conversations/{id}/messages", response_model=List[MessageResponse])
async def get_messages(id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppMessage).where(WhatsAppMessage.conversation_id == id).order_by(WhatsAppMessage.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

# --- Toggle Chatbot Mode (PATCH) ---
@router.patch("/conversations/{id}", response_model=ConversationResponse)
async def update_mode(id: str, body: ConversationUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppConversation).where(WhatsAppConversation.id == id)
    result = await db.execute(stmt)
    conversation = result.scalars().first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    conversation.mode = body.mode
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation

# --- Send Manual Message (POST) ---
@router.post("/conversations/{id}/send", response_model=MessageResponse)
async def send_manual_message(id: str, body: MessageSend, db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppConversation).where(WhatsAppConversation.id == id)
    result = await db.execute(stmt)
    conversation = result.scalars().first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Send message via Meta WhatsApp Service
    sent = await WhatsAppService.send_message(conversation.phone, body.message)
    
    # Save message in database
    manual_message = WhatsAppMessage(
        id=uuid.uuid4().hex,
        conversation_id=conversation.id,
        role="assistant",
        content=body.message
    )
    db.add(manual_message)
    
    # Update conversation last message timestamp
    conversation.updated_at = datetime.utcnow()
    db.add(conversation)
    
    await db.commit()
    await db.refresh(manual_message)
    return manual_message

# --- Get WhatsApp Settings (GET) ---
@router.get("/settings")
async def get_whatsapp_settings(db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppSettings).where(WhatsAppSettings.id == 1)
    result = await db.execute(stmt)
    whatsapp_settings = result.scalars().first()
    
    if not whatsapp_settings:
        whatsapp_settings = WhatsAppSettings(
            id=1,
            system_prompt="You are a helpful customer service assistant for DBS Aesthetics Clinic. Be professional, polite, and direct.",
            knowledge_base=(
                "DBS Aesthetics Clinic & Salon is a premium luxury wellness destination.\n\n"
                "1. BRANCH LOCATION:\n"
                "• Address: Block CCA, DHA Phase 5, Lahore, Pakistan.\n"
                "• Phone: +92 (300) 123-4567\n"
                "• Hours: Monday to Saturday, 11:00 AM - 8:00 PM. Closed on Sunday.\n\n"
                "2. POPULAR TREATMENTS & PRICING:\n"
                "• HydraFacial (Deep Cleansing): PKR 12,000\n"
                "• Laser Hair Removal (Full Face): PKR 8,000\n"
                "• Botox Injection (Per Unit): PKR 1,500\n"
                "• FUE Hair Transplant: Starting from PKR 150,000\n"
                "• Premium Gold Facial: PKR 15,000\n\n"
                "3. POLICIES:\n"
                "• Pre-booking is mandatory for all doctor consultations and salon services.\n"
                "• Please cancel or reschedule at least 24 hours in advance."
            )
        )
        db.add(whatsapp_settings)
        await db.commit()
        await db.refresh(whatsapp_settings)
        
    return whatsapp_settings

# --- Update WhatsApp Settings (POST) ---
@router.post("/settings")
async def update_whatsapp_settings(body: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(WhatsAppSettings).where(WhatsAppSettings.id == 1)
    result = await db.execute(stmt)
    whatsapp_settings = result.scalars().first()
    
    if not whatsapp_settings:
        whatsapp_settings = WhatsAppSettings(id=1)
        
    whatsapp_settings.system_prompt = body.system_prompt
    whatsapp_settings.knowledge_base = body.knowledge_base
    
    db.add(whatsapp_settings)
    await db.commit()
    await db.refresh(whatsapp_settings)
    return whatsapp_settings
