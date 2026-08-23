import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.firm import Firm

async def debug_firm():
    async with SessionLocal() as db:
        result = await db.execute(select(Firm).limit(1))
        firm = result.scalar_one_or_none()
        if not firm:
            print("No firm found")
            return
        
        print(f"Firm Name: {firm.name}")
        print(f"Has api_secret_key: {hasattr(firm, 'api_secret_key')}")
        print(f"api_secret_key value: {getattr(firm, 'api_secret_key', 'MISSING')}")
        print(f"Has key_last_rotated_at: {hasattr(firm, 'key_last_rotated_at')}")
        print(f"key_last_rotated_at value: {getattr(firm, 'key_last_rotated_at', 'MISSING')}")

if __name__ == "__main__":
    asyncio.run(debug_firm())
