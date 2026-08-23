"""Add folders and update documents hierarchy

Revision ID: 20260511_folders
Revises: ff2be15c35a2
Create Date: 2026-05-11 11:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260511_folders'
down_revision: Union[str, None] = 'ff2be15c35a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create folders table
    op.create_table('folders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('firm_id', sa.Uuid(), nullable=False),
        sa.Column('client_id', sa.Uuid(), nullable=True),
        sa.Column('parent_id', sa.Uuid(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_folders_client_id_clients')),
        sa.ForeignKeyConstraint(['firm_id'], ['firms.id'], name=op.f('fk_folders_firm_id_firms')),
        sa.ForeignKeyConstraint(['parent_id'], ['folders.id'], name=op.f('fk_folders_parent_id_folders')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_folders'))
    )
    op.create_index(op.f('idx_folders_client_id'), 'folders', ['client_id'], unique=False)
    op.create_index(op.f('idx_folders_firm_id'), 'folders', ['firm_id'], unique=False)

    # 2. Add folder_id to documents
    op.add_column('documents', sa.Column('folder_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('idx_documents_folder_id'), 'documents', ['folder_id'], unique=False)
    op.create_foreign_key(op.f('fk_documents_folder_id_folders'), 'documents', 'folders', ['folder_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(op.f('fk_documents_folder_id_folders'), 'documents', type_='foreignkey')
    op.drop_index(op.f('idx_documents_folder_id'), table_name='documents')
    op.drop_column('documents', 'folder_id')
    
    op.drop_index(op.f('idx_folders_firm_id'), table_name='folders')
    op.drop_index(op.f('idx_folders_client_id'), table_name='folders')
    op.drop_table('folders')
