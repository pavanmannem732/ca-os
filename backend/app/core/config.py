"""CA-OS Complete Settings — all env vars in one place."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "CA-OS"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    DATABASE_URL: Optional[str] = None
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: str = "5432"
    DB_NAME: Optional[str] = "postgres"
    DB_POOL_SIZE: int = 10

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production-must-be-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OTP_EXPIRE_SECONDS: int = 600
    OTP_MAX_ATTEMPTS: int = 5

    MISTRAL_API_KEY: Optional[str] = None
    MISTRAL_MODEL: str = "ministral-8b-latest"
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"
    OPENAI_API_KEY: Optional[str] = None

    WHATSAPP_API_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_APP_SECRET: Optional[str] = None

    MSG91_API_KEY: Optional[str] = None
    MSG91_TEMPLATE_ID_OTP: Optional[str] = None
    MSG91_SENDER_ID: str = "CAOS"

    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_DOCUMENTS: str = "caos-documents-dev"
    S3_BUCKET_EXPORTS: str = "caos-exports-dev"
    PRESIGNED_URL_EXPIRY_SECONDS: int = 3600

    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@caos.in"
    SENTRY_DSN: Optional[str] = None

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def sync_database_url(self) -> str:
        """Returns a sync version of the DB URL (psycopg2) for tools that don't support async."""
        url = self.get_database_url()
        return url.replace("asyncpg", "psycopg2")

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
