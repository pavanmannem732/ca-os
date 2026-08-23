import asyncio
import logging
from sqlalchemy import text
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SQL = """
-- 1. Add search vector column if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING GIN(search_vector);

-- 3. Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_client_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.primary_mobile, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.pan, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.primary_contact_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS clients_search_update ON clients;
CREATE TRIGGER clients_search_update
  BEFORE INSERT OR UPDATE OF name, primary_mobile, pan, primary_contact_name
  ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_search_vector();

-- 5. Backfill existing rows
UPDATE clients SET search_vector = 
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(primary_mobile, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(pan, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(primary_contact_name, '')), 'C');
"""

async def apply_search_architecture():
    logger.info("Applying Search Architecture (Full-Text Search)...")
    async with engine.begin() as conn:
        try:
            # We need to execute the commands one by one if using some drivers, 
            # but usually multi-statement is fine with engine.begin() for simple DDL
            # However, for safety and handling the DO block/triggers:
            # We split by ; if necessary or just run as one block.
            # asyncpg sometimes has issues with multiple commands in one string.
            
            # Split SQL into individual statements
            statements = [s.strip() for s in SQL.split(";") if s.strip()]
            for stmt in statements:
                if stmt:
                    await conn.execute(text(stmt))
            
            logger.info("Search Architecture applied successfully.")
        except Exception as e:
            logger.error(f"Error applying search architecture: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(apply_search_architecture())
