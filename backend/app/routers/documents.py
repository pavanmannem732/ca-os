"""Documents router — S3 presigned uploads and document management."""
import os
import shutil
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, status, Query, Request, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_firm_id, get_current_user_id, require_ca_staff
from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.models.document import Document, Folder

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "application/pdf", "image/png", "image/jpeg", "image/tiff",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel", "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB


class UploadUrlRequest(BaseModel):
    file_name: str
    file_size: int
    file_type: str
    client_id: UUID
    document_category: str
    task_id: Optional[UUID] = None


@router.post("/upload-url", status_code=status.HTTP_200_OK)
async def get_upload_url(
    body: UploadUrlRequest,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    from app.core.exceptions import ValidationError
    if body.file_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(f"File type '{body.file_type}' is not allowed")
    if body.file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError("File size exceeds the 25MB limit")

    if not settings.AWS_ACCESS_KEY_ID:
        # Dev mode: use local storage endpoint
        import uuid
        s3_key = f"{firm_id}/{body.client_id}/{uuid.uuid4()}/{body.file_name}"
        return {"data": {
            "upload_url": f"http://localhost:8000/api/v1/documents/local-upload?s3_key={s3_key}",
            "s3_key": s3_key,
            "s3_bucket": "local",
            "expires_in": 900,
        }}

    import boto3
    from botocore.exceptions import ClientError
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        import uuid
        s3_key = f"{firm_id}/{body.client_id}/{uuid.uuid4()}/{body.file_name}"
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_BUCKET_DOCUMENTS,
                "Key": s3_key,
                "ContentType": body.file_type,
            },
            ExpiresIn=settings.PRESIGNED_URL_EXPIRY_SECONDS,
        )
        return {"data": {
            "upload_url": presigned_url,
            "s3_key": s3_key,
            "s3_bucket": settings.S3_BUCKET_DOCUMENTS,
            "expires_in": settings.PRESIGNED_URL_EXPIRY_SECONDS,
        }}
    except ClientError as e:
        raise ServiceUnavailableError("S3")

class DocumentCreateSchema(BaseModel):
    file_name: str
    file_size_bytes: int
    file_type: str
    s3_key: str
    s3_bucket: str
    client_id: UUID
    document_category: str
    folder_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    upload_source: str = "web_app"

@router.put("/local-upload", status_code=status.HTTP_200_OK)
async def local_upload(s3_key: str, request: Request):
    """Fallback endpoint for development when S3 is not available."""
    upload_dir = os.path.join("uploads", os.path.dirname(s3_key))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join("uploads", s3_key)
    
    with open(file_path, "wb") as f:
        async for chunk in request.stream():
            f.write(chunk)
    
    return {"message": "Uploaded locally successfully"}

@router.get("/local-download/{s3_key:path}", status_code=status.HTTP_200_OK)
async def local_download(s3_key: str):
    """Fallback endpoint for development when S3 is not available."""
    file_path = os.path.join("uploads", s3_key)
    if not os.path.exists(file_path):
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Local file")
    return FileResponse(file_path)



@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_document(
    body: DocumentCreateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    doc = Document(
        firm_id=firm_id,
        client_id=body.client_id,
        task_id=body.task_id,
        file_name=body.file_name,
        file_size_bytes=body.file_size_bytes,
        file_type=body.file_type,
        s3_key=body.s3_key,
        s3_bucket=body.s3_bucket,
        folder_id=body.folder_id,
        document_category=body.document_category,
        upload_source=body.upload_source,
        uploaded_by_user_id=user_id,
    )
    db.add(doc)
    await db.flush()
    return {"data": {"id": str(doc.id), "file_name": doc.file_name}, "message": "Document record created"}


class FolderCreateSchema(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    client_id: Optional[UUID] = None


@router.post("/folders", status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    folder = Folder(
        firm_id=firm_id,
        client_id=body.client_id,
        parent_id=body.parent_id,
        name=body.name,
    )
    db.add(folder)
    await db.flush()
    return {"data": {"id": str(folder.id), "name": folder.name}}


@router.get("/", status_code=status.HTTP_200_OK)
async def list_documents(
    parent_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    # 1. List folders
    f_query = select(Folder).where(
        Folder.firm_id == firm_id,
        Folder.parent_id == parent_id,
    )
    if client_id:
        f_query = f_query.where(Folder.client_id == client_id)
    folders = (await db.execute(f_query)).scalars().all()

    # 2. List documents
    d_query = select(Document).where(
        Document.firm_id == firm_id,
        Document.folder_id == parent_id,
        Document.is_archived == False,
    )
    if client_id:
        d_query = d_query.where(Document.client_id == client_id)
    docs = (await db.execute(d_query)).scalars().all()

    return {
        "data": {
            "folders": [
                {"id": str(f.id), "name": f.name, "type": "folder", "created_at": f.created_at.isoformat()}
                for f in folders
            ],
            "documents": [
                {
                    "id": str(d.id),
                    "file_name": d.file_name,
                    "file_type": d.file_type,
                    "file_size_bytes": d.file_size_bytes,
                    "client_id": str(d.client_id),
                    "document_category": d.document_category,
                    "type": "file",
                    "created_at": d.created_at.isoformat(),
                }
                for d in docs
            ]
        }
    }
@router.get("/{document_id}/download-url", status_code=status.HTTP_200_OK)
async def get_download_url(
    document_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    doc = await db.get(Document, document_id)
    if not doc or doc.firm_id != firm_id:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Document", document_id)

    if not settings.AWS_ACCESS_KEY_ID or doc.s3_bucket == "local":
        return {"data": {"download_url": f"http://localhost:8000/api/v1/documents/local-download/{doc.s3_key}"}}

    import boto3
    from botocore.exceptions import ClientError
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": doc.s3_bucket,
                "Key": doc.s3_key,
                "ResponseContentDisposition": f"attachment; filename={doc.file_name}",
            },
            ExpiresIn=settings.PRESIGNED_URL_EXPIRY_SECONDS,
        )
        return {"data": {"download_url": presigned_url}}
    except ClientError as e:
        raise ServiceUnavailableError("S3")

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    doc = await db.get(Document, document_id)
    if not doc or doc.firm_id != firm_id:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Document", document_id)
    
    doc.is_archived = True
    await db.commit()
    return {"message": "Document deleted successfully"}
