"""Celery app — properly configured from settings."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ca_os_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.reminder_tasks.*": {"queue": "high_priority"},
        "app.tasks.document_tasks.*": {"queue": "standard"},
        "app.tasks.billing_tasks.*": {"queue": "low_priority"},
        "app.tasks.analytics_tasks.*": {"queue": "low_priority"},
    },
    beat_schedule={
        "deadline-reminders-every-6h": {
            "task": "app.tasks.reminder_tasks.send_deadline_reminders",
            "schedule": 6 * 3600,
        },
        "monthly-invoices-1st": {
            "task": "app.tasks.billing_tasks.auto_generate_invoices",
            "schedule": 24 * 3600,
        },
    },
)

# Auto-discover all task modules
celery_app.autodiscover_tasks([
    "app.tasks.reminder_tasks",
    "app.tasks.document_tasks",
    "app.tasks.billing_tasks",
    "app.tasks.analytics_tasks",
])
