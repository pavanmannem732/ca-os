import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix_db():
    print("Connecting to database to fix constraints...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE ai_drafts ALTER COLUMN created_by DROP NOT NULL;"))
            await conn.execute(text("ALTER TABLE ai_drafts ALTER COLUMN total_cost_usd SET DEFAULT 0.0;"))
            print("Successfully dropped NOT NULL constraint on ai_drafts.created_by")
    except Exception as e:
        print(f"Error fixing database: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_db())
