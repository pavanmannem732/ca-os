import asyncio
from sqlalchemy import text
from app.core.database import engine

async def apply_performance_indexes():
    print("🚀 Starting Database Performance Optimization...")
    
    indexes = [
        # Compliance Tasks: Optimize health score and calendar queries
        "CREATE INDEX IF NOT EXISTS idx_compliance_tasks_firm_status ON compliance_tasks (firm_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON compliance_tasks (due_date);",
        
        # Invoices: Optimize revenue analytics
        "CREATE INDEX IF NOT EXISTS idx_invoices_firm_status ON invoices (firm_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_total_amount ON invoices (total_amount);",
        
        # Clients: Optimize firm-wide client lookups
        "CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON clients (firm_id);",
        "CREATE INDEX IF NOT EXISTS idx_clients_health_score ON clients (compliance_health_score);",
        
        # AI Drafts: Optimize usage tracking
        "CREATE INDEX IF NOT EXISTS idx_ai_drafts_firm_used ON ai_drafts (firm_id, was_used);"
    ]
    
    async with engine.begin() as conn:
        for sql in indexes:
            try:
                await conn.execute(text(sql))
                print(f"✅ Applied: {sql.split('ON')[1].split(';')[0].strip()}")
            except Exception as e:
                print(f"❌ Failed to apply index: {e}")

    print("✨ Database optimization complete. Response times should be significantly improved.")

if __name__ == "__main__":
    asyncio.run(apply_performance_indexes())
