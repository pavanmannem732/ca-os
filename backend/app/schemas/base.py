# Pydantic Schemas
from pydantic import BaseModel
class HealthCheck(BaseModel):
    status: str
