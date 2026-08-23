"""Billing router — invoices and time logs."""
from uuid import UUID
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_firm_id, get_current_user_id, require_firm_owner, require_ca_staff
from app.core.exceptions import NotFoundError
from app.models.billing import Invoice, InvoiceStatus, BillingLog
from app.services.billing_service import billing_service

router = APIRouter()


@router.get("/invoices", status_code=status.HTTP_200_OK)
async def list_invoices(
    client_id: Optional[UUID] = Query(None),
    inv_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    query = select(Invoice).where(Invoice.firm_id == firm_id)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if inv_status:
        query = query.where(Invoice.status == InvoiceStatus(inv_status))
    query = query.order_by(Invoice.invoice_date.desc()).offset((page - 1) * limit).limit(limit)
    invoices = (await db.execute(query)).scalars().all()
    return {"data": [
        {
            "id": str(i.id),
            "invoice_number": i.invoice_number,
            "client_id": str(i.client_id),
            "total_amount": i.total_amount,
            "status": i.status,
            "invoice_date": i.invoice_date.isoformat(),
            "due_date": i.due_date.isoformat() if i.due_date else None,
        }
        for i in invoices
    ]}


class InvoiceCreateSchema(BaseModel):
    client_id: UUID
    invoice_date: date
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    line_items: list
    gst_rate: float = 18.0
    due_date: Optional[date] = None
    notes: Optional[str] = None


@router.post("/invoices", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    body: InvoiceCreateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    subtotal = sum(item.get("amount", 0) for item in body.line_items)
    gst_amount = round(subtotal * body.gst_rate / 100, 2)
    total = round(subtotal + gst_amount, 2)

    from datetime import datetime
    inv_num = f"INV-{datetime.now().strftime('%Y%m')}-{firm_id.hex[:4].upper()}"

    invoice = Invoice(
        firm_id=firm_id,
        client_id=body.client_id,
        invoice_number=inv_num,
        invoice_date=body.invoice_date,
        billing_period_start=body.billing_period_start,
        billing_period_end=body.billing_period_end,
        line_items_json=body.line_items,
        subtotal=subtotal,
        gst_amount=gst_amount,
        total_amount=total,
        status=InvoiceStatus.DRAFT,
        due_date=body.due_date,
        notes=body.notes,
        created_by=user_id,
    )
    db.add(invoice)
    await db.flush()
    return {"data": {"id": str(invoice.id), "invoice_number": invoice.invoice_number, "total_amount": total}}


class TimeLogSchema(BaseModel):
    client_id: UUID
    work_date: date
    hours: float
    description: str
    work_category: str
    is_billable: bool = True


@router.post("/time-logs", status_code=status.HTTP_201_CREATED)
async def add_time_log(
    body: TimeLogSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    log = BillingLog(
        firm_id=firm_id,
        client_id=body.client_id,
        staff_user_id=user_id,
        work_date=body.work_date,
        hours=body.hours,
        description=body.description,
        work_category=body.work_category,
        billable_amount=0,
        is_billable=body.is_billable,
    )
    db.add(log)
    await db.flush()
    return {"data": {"id": str(log.id)}, "message": "Time log recorded"}
@router.get("/invoices/{invoice_id}", status_code=status.HTTP_200_OK)
async def get_invoice(
    invoice_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    """Retrieves full invoice details including line items."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.firm_id == firm_id))
    invoice = result.scalars().first()
    if not invoice:
        raise NotFoundError("Invoice")
    
    return {"data": {
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "client_id": str(invoice.client_id),
        "total_amount": invoice.total_amount,
        "subtotal": invoice.subtotal,
        "gst_amount": invoice.gst_amount,
        "status": invoice.status,
        "invoice_date": invoice.invoice_date.isoformat(),
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "notes": invoice.notes,
        "line_items": invoice.line_items_json,
    }}


@router.post("/invoices/{invoice_id}/send", status_code=status.HTTP_200_OK)
async def send_invoice(
    invoice_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    """Generates a Razorpay payment link and marks invoice as sent."""
    payment_link = await billing_service.create_payment_link(db, invoice_id)
    return {"data": {"payment_url": payment_link}, "message": "Payment link generated successfully"}


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_200_OK)
async def delete_invoice(
    invoice_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    """Deletes an invoice."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.firm_id == firm_id))
    invoice = result.scalars().first()
    if not invoice:
        raise NotFoundError("Invoice")
    
    await db.delete(invoice)
    await db.commit()
    return {"message": "Invoice deleted successfully"}
