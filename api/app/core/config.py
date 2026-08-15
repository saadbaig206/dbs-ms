import os
from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env" if os.path.exists(".env") else "../.env",
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    PROJECT_NAME: str = "Aura Luxury Clinic POS & Management API"

    BACKEND_CORS_ORIGINS: Union[str, List[str]] = []

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
        return self.BACKEND_CORS_ORIGINS

    DATABASE_URL: str

    GROQ_API_KEY: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "aura_clinic_whatsapp_verify_token"

settings = Settings()

