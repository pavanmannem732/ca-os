"""Add missing audit columns to folders

Revision ID: 20260511_folders_fix
Revises: 20260511_folders
Create Date: 2026-05-11 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260511_folders_fix'
down_revision: Union[str, None] = '20260511_folders'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('folders', sa.Column('created_by', sa.Uuid(), nullable=True))
    op.add_column('folders', sa.Column('updated_by', sa.Uuid(), nullable=True))


def downgrade() -> None:
    op.drop_column('folders', 'updated_by')
    op.drop_column('folders', 'created_by')
