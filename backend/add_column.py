import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_description_column():
    print("🛠️  Updating database schema...")
    
    sql = "ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS description TEXT;"
    
    async with engine.begin() as conn:
        try:
            await conn.execute(text(sql))
            print("✅ Column 'description' added successfully to 'compliance_tasks'.")
        except Exception as e:
            print(f"❌ Failed to add column: {e}")

if __name__ == "__main__":
    asyncio.run(add_description_column())
