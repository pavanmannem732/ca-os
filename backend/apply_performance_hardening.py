import asyncio
from sqlalchemy import text
from app.core.database import engine

async def apply_performance_hardening():
    sql_file = "migrations/performance_hardening.sql"
    print(f"Reading {sql_file}...")
    
    with open(sql_file, "r") as f:
        sql = f.read()
    
    print("Applying performance hardening to database...")
    try:
        async with engine.begin() as conn:
            # Standard splitting logic
            statements = []
            current_stmt = []
            in_dollar_block = False
            
            for line in sql.split('\n'):
                if "$$" in line:
                    if line.count("$$") % 2 != 0:
                        in_dollar_block = not in_dollar_block
                current_stmt.append(line)
                if not in_dollar_block and line.strip().endswith(';'):
                    statements.append('\n'.join(current_stmt))
                    current_stmt = []
            
            if current_stmt:
                statements.append('\n'.join(current_stmt))

            for stmt in statements:
                clean_stmt = stmt.strip()
                if not clean_stmt:
                    continue
                print(f"Executing: {clean_stmt[:50]}...")
                await conn.execute(text(clean_stmt))
            print("Successfully applied performance hardening.")
    except Exception as e:
        print(f"Error applying performance hardening: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_performance_hardening())
