import asyncio
from sqlalchemy import text
from app.core.database import engine

async def apply_security():
    sql_file = "migrations/secure_tables.sql"
    print(f"Reading {sql_file}...")
    
    with open(sql_file, "r") as f:
        sql = f.read()
    
    # Split by double dollar sign or other delimiters if needed, 
    # but for simplicity we'll split by common SQL separators or run as a block.
    # PostgreSQL allows running multiple statements in one execute call via some drivers,
    # but for safety and RLS we'll try to run the block.
    
    print("Applying security policies to database...")
    try:
        async with engine.begin() as conn:
            # More robust splitting logic to handle $$ blocks
            statements = []
            current_stmt = []
            in_dollar_block = False
            
            for line in sql.split('\n'):
                # Check for $$ start/end on this line
                if "$$" in line:
                    # Toggle state (this is simple but works if $$ is used for blocks)
                    # A more complex one would check count of $$
                    if line.count("$$") % 2 != 0:
                        in_dollar_block = not in_dollar_block
                
                current_stmt.append(line)
                
                if not in_dollar_block and line.strip().endswith(';'):
                    statements.append('\n'.join(current_stmt))
                    current_stmt = []
            
            # Handle any remaining
            if current_stmt:
                statements.append('\n'.join(current_stmt))

            for stmt in statements:
                clean_stmt = stmt.strip()
                if not clean_stmt:
                    continue
                
                print(f"Executing: {clean_stmt[:50]}...")
                await conn.execute(text(clean_stmt))
                    
            print("Successfully enabled RLS and applied firm isolation policies.")
    except Exception as e:
        print(f"Error applying security policies: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_security())
