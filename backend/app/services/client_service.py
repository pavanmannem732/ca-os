"""Client service — CRUD and compliance calendar generation."""
import logging
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ConflictError, ForbiddenError
from app.core.security import slugify, generate_unique_suffix
from app.models.client import Client, ClientType
from app.models.compliance_task import ComplianceTask, TaskStatus
from app.utils.gst_calendar import generate_gst_tasks_for_client
from app.utils.validators import validate_gstin, validate_pan, validate_mobile

logger = logging.getLogger(__name__)


class ClientService:

    @staticmethod
    async def list_clients(
        firm_id: UUID,
        db: AsyncSession,
        page: int = 1,
        limit: int = 25,
        search: Optional[str] = None,
        compliance_service: Optional[str] = None,
        include_archived: bool = False,
    ) -> dict:
        query = select(Client).where(
            Client.firm_id == firm_id,
            Client.deleted_at.is_(None),
        )
        if not include_archived:
            query = query.where(Client.archived_at.is_(None))
        if search:
            like = f"%{search}%"
            query = query.where(
                or_(
                    Client.name.ilike(like),
                    Client.gstin.ilike(like),
                    Client.pan.ilike(like),
                )
            )
        if compliance_service:
            query = query.where(Client.compliance_services.contains([compliance_service]))

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        query = query.order_by(Client.name).offset((page - 1) * limit).limit(limit)
        clients = (await db.execute(query)).scalars().all()

        return {
            "items": [ClientService._to_summary(c) for c in clients],
            "total": total,
            "page": page,
            "page_size": limit,
            "pages": (total + limit - 1) // limit,
        }

    @staticmethod
    async def get_client(client_id: UUID, firm_id: UUID, db: AsyncSession) -> Client:
        result = await db.execute(
            select(Client).where(
                Client.id == client_id,
                Client.firm_id == firm_id,
                Client.archived_at.is_(None),
            )
        )
        client = result.scalar_one_or_none()
        if not client:
            raise NotFoundError("Client", str(client_id))
        return client

    @staticmethod
    async def create_client(firm_id: UUID, user_id: UUID, data: dict, db: AsyncSession) -> Client:
        # Validate identifiers
        if data.get("gstin") and not validate_gstin(data["gstin"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid GSTIN format (should be 15 chars e.g. 27AAAAA0000A1Z5)")
        if data.get("pan") and not validate_pan(data["pan"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid PAN format (should be 10 chars e.g. ABCDE1234F)")
        if data.get("primary_mobile") and not validate_mobile(data["primary_mobile"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid mobile number (should be 10 digits starting with 6-9)")

        slug = f"{slugify(data['name'])}-{generate_unique_suffix()}"
        client = Client(
            firm_id=firm_id,
            slug=slug,
            created_by=user_id,
            **{k: v for k, v in data.items() if k not in ("id", "firm_id", "slug")},
        )
        db.add(client)
        await db.flush()

        # Auto-generate compliance tasks
        tasks_data = generate_gst_tasks_for_client(
            compliance_services=data.get("compliance_services", []),
            gst_filing_frequency=data.get("gst_filing_frequency"),
            start_year=__import__("datetime").date.today().year,
        )
        for t in tasks_data:
            task = ComplianceTask(
                firm_id=firm_id,
                client_id=client.id,
                status=TaskStatus.NOT_STARTED,
                created_by=user_id,
                **t,
            )
            db.add(task)

        logger.info(f"Client {client.id} created with {len(tasks_data)} auto-tasks")
        return client

    @staticmethod
    async def update_client(client_id: UUID, firm_id: UUID, user_id: UUID, data: dict, db: AsyncSession) -> Client:
        client = await ClientService.get_client(client_id, firm_id, db)
        
        # Validate identifiers if they are being updated
        if data.get("gstin") and not validate_gstin(data["gstin"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid GSTIN format")
        if data.get("pan") and not validate_pan(data["pan"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid PAN format")
        if data.get("primary_mobile") and not validate_mobile(data["primary_mobile"]):
            from app.core.exceptions import ValidationError
            raise ValidationError("Invalid mobile number")

        for key, value in data.items():
            if hasattr(client, key):
                setattr(client, key, value)
        
        client.updated_by = user_id
        await db.flush()
        return client

    @staticmethod
    async def archive_client(client_id: UUID, firm_id: UUID, user_id: UUID, db: AsyncSession) -> None:
        client = await ClientService.get_client(client_id, firm_id, db)
        from datetime import datetime, timezone
        client.archived_at = datetime.now(timezone.utc)
        client.updated_by = user_id
        await db.flush()

    @staticmethod
    async def restore_client(client_id: UUID, firm_id: UUID, user_id: UUID, db: AsyncSession) -> Client:
        result = await db.execute(
            select(Client).where(
                Client.id == client_id,
                Client.firm_id == firm_id,
                Client.deleted_at.is_(None),
            )
        )
        client = result.scalar_one_or_none()
        if not client:
            raise NotFoundError("Client", str(client_id))
        
        client.archived_at = None
        client.updated_by = user_id
        await db.flush()
        return client

    @staticmethod
    def _to_summary(c: Client) -> dict:
        return {
            "id": str(c.id),
            "name": c.name,
            "gstin": c.gstin,
            "pan": c.pan,
            "client_type": c.client_type,
            "compliance_services": c.compliance_services,
            "compliance_health_score": c.compliance_health_score,
            "penalty_risk_score": c.penalty_risk_score,
            "churn_risk": c.churn_risk,
            "primary_mobile": c.primary_mobile,
            "primary_email": c.primary_email,
            "assigned_primary_staff_id": str(c.assigned_primary_staff_id) if c.assigned_primary_staff_id else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
