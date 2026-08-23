import asyncio
from sqlalchemy import text
from app.core.database import engine

async def apply_performance():
    sql_file = "migrations/performance_optimization.sql"
    print(f"Reading {sql_file}...")
    
    with open(sql_file, "r") as f:
        sql = f.read()
    
    print("Applying performance optimizations to database...")
    try:
        async with engine.begin() as conn:
            # Split by semicolon and run each
            statements = sql.split(';')
            for stmt in statements:
                clean_stmt = stmt.strip()
                if not clean_stmt:
                    continue
                print(f"Executing: {clean_stmt[:50]}...")
                await conn.execute(text(clean_stmt))
            print("Successfully applied performance optimizations.")
    except Exception as e:
        print(f"Error applying performance optimizations: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_performance())
