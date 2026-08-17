from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, func
from app.models.base import Base

class WhatsAppConversation(Base):
    __tablename__ = "whatsapp_conversations"

    id = Column(String, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    mode = Column(String, default="agent", nullable=False) # 'agent' or 'human'
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    whatsapp_msg_id = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class WhatsAppSettings(Base):
    __tablename__ = "whatsapp_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True, unique=True)
    system_prompt = Column(Text, nullable=True)
    knowledge_base = Column(Text, nullable=True)
