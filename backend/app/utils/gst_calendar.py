"""GST compliance calendar engine — generates all Indian statutory deadlines."""
from datetime import date, timedelta
from typing import List, Optional
import calendar

# ─── Metadata and Descriptions ───────────────────────────────────────────────

TASK_METADATA = {
    "gstr1_monthly": {
        "name": "GSTR-1 Monthly",
        "description": "Filing of outward supply details. Due on 11th of the following month.",
        "priority": "high"
    },
    "gstr3b_monthly": {
        "name": "GSTR-3B Monthly",
        "description": "Summary return and tax payment. Due on 20th of the following month.",
        "priority": "critical"
    },
    "tds_q1": {"name": "TDS Q1 Return", "description": "Quarterly TDS return for April-June period.", "priority": "medium"},
    "tds_q2": {"name": "TDS Q2 Return", "description": "Quarterly TDS return for July-September period.", "priority": "medium"},
    "tds_q3": {"name": "TDS Q3 Return", "description": "Quarterly TDS return for October-December period.", "priority": "medium"},
    "tds_q4": {"name": "TDS Q4 Return", "description": "Quarterly TDS return for January-March period.", "priority": "medium"},
    "advance_tax_q1": {"name": "Advance Tax Q1", "description": "15% of estimated tax liability due.", "priority": "high"},
    "advance_tax_q2": {"name": "Advance Tax Q2", "description": "45% of estimated tax liability due.", "priority": "high"},
    "advance_tax_q3": {"name": "Advance Tax Q3", "description": "75% of estimated tax liability due.", "priority": "high"},
    "advance_tax_q4": {"name": "Advance Tax Q4", "description": "100% of estimated tax liability due.", "priority": "high"},
    "itr_company": {"name": "Income Tax Return (Co)", "description": "Annual Income Tax Return for corporate entities.", "priority": "critical"},
    "tax_audit_3ca": {"name": "Tax Audit (3CA/CB)", "description": "Filing of tax audit report under Income Tax Act.", "priority": "critical"},
    "gstr9_annual": {"name": "GSTR-9 Annual", "description": "Annual GST reconciliation return.", "priority": "high"}
}

# ─── Deadline Logic ──────────────────────────────────────────────────────────

GSTR1_MONTHLY_DAY = 11
GSTR3B_MONTHLY_DAY = 20

INDIAN_HOLIDAYS_2025 = {
    date(2025, 1, 26), date(2025, 3, 14), date(2025, 4, 14),
    date(2025, 8, 15), date(2025, 10, 2), date(2025, 11, 5),
    date(2025, 11, 15), date(2025, 12, 25),
}

ALL_HOLIDAYS = INDIAN_HOLIDAYS_2025

def shift_to_next_working_day(d: date) -> date:
    while d.weekday() >= 5 or d in ALL_HOLIDAYS:
        d += timedelta(days=1)
    return d

def make_deadline(year: int, month: int, day: int) -> date:
    max_day = calendar.monthrange(year, month)[1]
    actual_day = min(day, max_day)
    d = date(year, month, actual_day)
    return shift_to_next_working_day(d)

# ─── Compliance Task Generator ───────────────────────────────────────────────

def generate_gst_tasks_for_client(
    compliance_services: List[str],
    gst_filing_frequency: Optional[str],
    start_year: int,
    num_months: int = 12,
) -> List[dict]:
    tasks = []
    today = date.today()
    start_month = today.month
    start_year = today.year

    for i in range(num_months):
        month = (start_month + i - 1) % 12 + 1
        year = start_year + (start_month + i - 1) // 12

        # GST Monthly
        if "gst_monthly" in compliance_services and gst_filing_frequency == "monthly":
            for t_type in ["gstr1_monthly", "gstr3b_monthly"]:
                meta = TASK_METADATA.get(t_type, {})
                day = GSTR1_MONTHLY_DAY if "1" in t_type else GSTR3B_MONTHLY_DAY
                tasks.append({
                    "task_type": t_type,
                    "custom_task_name": meta.get("name"),
                    "description": meta.get("description"),
                    "priority": meta.get("priority", "medium"),
                    "period_month": month,
                    "period_year": year,
                    "due_date": make_deadline(year, month, day),
                })

        # TDS Quarterly
        if "tds_quarterly" in compliance_services and month in (6, 9, 12, 3):
            quarter = {6: 1, 9: 2, 12: 3, 3: 4}[month]
            t_type = f"tds_q{quarter}"
            meta = TASK_METADATA.get(t_type, {})
            tasks.append({
                "task_type": t_type,
                "custom_task_name": meta.get("name"),
                "description": meta.get("description"),
                "priority": meta.get("priority", "medium"),
                "period_month": month,
                "period_year": year,
                "period_quarter": quarter,
                "due_date": make_deadline(year, month, 31),
            })

        # Advance Tax
        if "itr_annual" in compliance_services and month in (6, 9, 12, 3):
            quarter = {6: 1, 9: 2, 12: 3, 3: 4}[month]
            t_type = f"advance_tax_q{quarter}"
            meta = TASK_METADATA.get(t_type, {})
            tasks.append({
                "task_type": t_type,
                "custom_task_name": meta.get("name"),
                "description": meta.get("description"),
                "priority": meta.get("priority", "medium"),
                "period_month": month,
                "period_year": year,
                "period_quarter": quarter,
                "due_date": make_deadline(year, month, 15),
            })

    return tasks
