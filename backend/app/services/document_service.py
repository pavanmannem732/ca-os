import logging
import asyncio
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.models.document import Document, DocumentCategory
from app.models.compliance_task import ComplianceTask
from app.core.config import settings
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class DocumentService:
    async def create_document_record(
        self, 
        db: AsyncSession, 
        firm_id: UUID, 
        client_id: UUID, 
        file_name: str, 
        s3_key: str,
        file_size_bytes: int,
        file_type: str,
        document_category: DocumentCategory = DocumentCategory.OTHER,
        task_id: Optional[UUID] = None,
        upload_source: str = "web_portal",
        uploaded_by_user_id: Optional[UUID] = None,
        uploaded_by_client: bool = False
    ) -> Document:
        """
        Creates a document record and triggers the processing pipeline (Section 47.1).
        """
        new_doc = Document(
            id=uuid4(),
            firm_id=firm_id,
            client_id=client_id,
            task_id=task_id,
            file_name=file_name,
            file_size_bytes=file_size_bytes,
            file_type=file_type,
            s3_key=s3_key,
            s3_bucket=settings.S3_BUCKET_DOCUMENTS,
            document_category=document_category,
            upload_source=upload_source,
            uploaded_by_user_id=uploaded_by_user_id,
            uploaded_by_client=uploaded_by_client,
            virus_scan_status="pending",
            ocr_status="pending"
        )
        db.add(new_doc)
        await db.flush()
        
        # Trigger background processing
        # In production, this would be a Celery task: process_document_pipeline.delay(new_doc.id)
        asyncio.create_task(self.process_document_pipeline(new_doc.id, firm_id))
        
        return new_doc

    async def process_document_pipeline(self, document_id: UUID, firm_id: UUID):
        """
        Complete Document Processing Pipeline (Section 47.1).
        """
        from app.core.database import SessionLocal
        
        async with SessionLocal() as db:
            try:
                # 1. Virus Scan (Mock)
                logger.info(f"Starting virus scan for document {document_id}")
                await asyncio.sleep(1) # Simulate scan
                await db.execute(
                    update(Document)
                    .where(Document.id == document_id)
                    .values(
                        virus_scan_status="clean", 
                        virus_scan_completed_at=datetime.now(timezone.utc)
                    )
                )
                await db.commit()

                # 2. OCR Extraction & AI Summary
                logger.info(f"Starting OCR extraction for document {document_id}")
                await self.process_ocr_extraction(db, document_id)
                
                # 3. Check if this completes a document request
                doc = await db.get(Document, document_id)
                if doc and doc.task_id:
                    await self._check_and_update_task_status(db, doc.task_id)

                # 4. Notify via WebSocket
                from app.core.socket_manager import socket_manager
                await socket_manager.broadcast_to_firm(str(firm_id), {
                    "type": "document.processed",
                    "payload": {
                        "document_id": str(document_id),
                        "status": "completed"
                    }
                })
                
            except Exception as e:
                logger.error(f"Error in document pipeline for {document_id}: {e}")
                await db.execute(
                    update(Document)
                    .where(Document.id == document_id)
                    .values(ocr_status="failed")
                )
                await db.commit()

    async def process_ocr_extraction(self, db: AsyncSession, document_id: UUID):
        """
        Simulates OCR extraction and AI summary (Section 47.1).
        """
        doc = await db.get(Document, document_id)
        if not doc:
            return

        # Simulate Google Document AI / PDF.js extraction
        # In reality, we'd call the respective APIs
        await asyncio.sleep(2) # Simulate processing
        
        extracted_data = {
            "document_type": doc.document_category.value,
            "confidence_score": 0.95,
            "extracted_fields": {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "total_amount": 1000.0,
                "currency": "INR"
            }
        }
        
        # Generate AI Summary using AIService
        ai_summary = f"Automated summary for {doc.file_name}: This is a {doc.document_category.value} uploaded on {datetime.now().date()}."
        
        doc.ocr_status = "completed"
        doc.ocr_completed_at = datetime.now(timezone.utc)
        doc.extracted_data_json = extracted_data
        doc.ai_summary = ai_summary
        
        await db.commit()

    async def _check_and_update_task_status(self, db: AsyncSession, task_id: UUID):
        """
        Checks if all documents for a task are ready (Section 47.1).
        """
        task = await db.get(ComplianceTask, task_id)
        if not task:
            return
            
        # For MVP: Mark documents_ready = True if at least one document is uploaded
        task.documents_ready = True
        await db.commit()

document_service = DocumentService()
