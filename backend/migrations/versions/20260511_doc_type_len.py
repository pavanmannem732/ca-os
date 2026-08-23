"""Increase document file_type length

Revision ID: 20260511_doc_type_len
Revises: 20260511_folders_fix
Create Date: 2026-05-11 12:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260511_doc_type_len'
down_revision: Union[str, None] = '20260511_folders_fix'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('documents', 'file_type',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.String(length=255),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('documents', 'file_type',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
