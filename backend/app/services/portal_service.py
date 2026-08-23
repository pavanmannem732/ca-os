import logging
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.billing import Invoice
from app.core.config import settings

logger = logging.getLogger(__name__)

class PortalService:
    @staticmethod
    async def get_upload_url(
        client_id: UUID,
        firm_id: UUID,
        file_name: str,
        file_type: str,
        task_id: Optional[UUID] = None
    ) -> Dict[str, str]:
        """
        Generates a pre-signed URL for document upload (Section 7.2).
        In this mock implementation, we return a local upload path or a fake S3 URL.
        """
        doc_id = uuid4()
        # Section 32.1 Layer 3: S3 Object Key Namespacing
        s3_key = f"{firm_id}/{client_id}/{doc_id}/{file_name}"
        
        # In production, we'd use boto3 to generate a pre-signed URL
        # url = s3_client.generate_presigned_url('put_object', Params={'Bucket': settings.S3_BUCKET_DOCUMENTS, 'Key': s3_key}, ...)
        
        mock_url = f"https://{settings.S3_BUCKET_DOCUMENTS}.s3.amazonaws.com/{s3_key}?signature=mock_sig"
        
        return {
            "upload_url": mock_url,
            "s3_key": s3_key,
            "document_id": str(doc_id)
        }

    @staticmethod
    async def get_client_invoices(
        db: AsyncSession,
        client_id: UUID,
        firm_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Returns invoices for the portal client (Section 7.2).
        """
        stmt = select(Invoice).where(
            Invoice.client_id == client_id,
            Invoice.firm_id == firm_id,
            Invoice.deleted_at.is_(None)
        ).order_by(Invoice.created_at.desc())
        
        result = await db.execute(stmt)
        invoices = result.scalars().all()
        
        return [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "amount": float(inv.total_amount),
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "payment_url": inv.razorpay_payment_link
            }
            for inv in invoices
        ]

portal_service = PortalService()
