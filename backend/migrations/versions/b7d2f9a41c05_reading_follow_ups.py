"""reading follow-ups

Questions the dreamer asks about a reading, with Claude's answers (decision 26).

Revision ID: b7d2f9a41c05
Revises: a1c4e7f20b31
Create Date: 2026-11-16 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7d2f9a41c05'
down_revision: Union[str, Sequence[str], None] = 'a1c4e7f20b31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'follow_ups',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column('interpretation_id', sa.BigInteger(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('model', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['interpretation_id'], ['interpretations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_follow_ups_interpretation_id'), 'follow_ups', ['interpretation_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_follow_ups_interpretation_id'), table_name='follow_ups')
    op.drop_table('follow_ups')
