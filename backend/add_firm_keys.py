import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_firm_key_columns():
    print("🛠️  Updating firm schema...")
    
    queries = [
        "ALTER TABLE firms ADD COLUMN IF NOT EXISTS api_secret_key VARCHAR(100);",
        "ALTER TABLE firms ADD COLUMN IF NOT EXISTS key_last_rotated_at TIMESTAMP WITH TIME ZONE;"
    ]
    
    async with engine.begin() as conn:
        for sql in queries:
            try:
                await conn.execute(text(sql))
                print(f"✅ Executed: {sql}")
            except Exception as e:
                print(f"❌ Failed: {sql} | Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_firm_key_columns())
