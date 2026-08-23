import asyncio
from sqlalchemy import select
from app.core.database import engine
from app.models.whatsapp import WhatsAppMessage

async def check():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                select(WhatsAppMessage).order_by(WhatsAppMessage.created_at.desc()).limit(10)
            )
            print("\n--- Latest Messages ---")
            for r in result:
                print(f"[{r.direction}] {r.body[:60]}...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
