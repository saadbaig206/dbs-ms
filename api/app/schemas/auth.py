from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    branch_id: Optional[str] = None

    class Config:
        from_attributes = True

class PartnerCreate(BaseModel):
    username: str
    password: str

