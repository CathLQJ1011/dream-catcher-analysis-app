"""reading resonance scale

"Does this resonate?" becomes a 1-5 slider instead of yes / not really.
Earlier answers carry over: yes -> 4, not really -> 2.

Revision ID: a1c4e7f20b31
Revises: 700b9e538741
Create Date: 2026-11-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c4e7f20b31'
down_revision: Union[str, Sequence[str], None] = '700b9e538741'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('interpretations', sa.Column('resonance', sa.SmallInteger(), nullable=True))
    op.execute("UPDATE interpretations SET resonance = CASE WHEN resonated THEN 4 ELSE 2 END WHERE resonated IS NOT NULL")
    op.create_check_constraint('interpretation_resonance_valid', 'interpretations', 'resonance BETWEEN 1 AND 5')
    op.drop_column('interpretations', 'resonated')


def downgrade() -> None:
    op.add_column('interpretations', sa.Column('resonated', sa.Boolean(), nullable=True))
    op.execute("UPDATE interpretations SET resonated = resonance >= 3 WHERE resonance IS NOT NULL")
    op.drop_constraint('interpretation_resonance_valid', 'interpretations', type_='check')
    op.drop_column('interpretations', 'resonance')
