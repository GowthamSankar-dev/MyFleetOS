"""Initial migration — creates vehicles and locations tables.

Revision ID: 001
"""

from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "vehicles" not in tables:
        # ── vehicles ────────────────────────────────────────────────────────────
        op.create_table(
            "vehicles",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("device_id", sa.String(length=64), nullable=False),
            sa.Column(
                "name",
                sa.String(length=128),
                nullable=False,
                server_default="Unknown Vehicle",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_vehicles_id"), "vehicles", ["id"], unique=False)
        op.create_index(
            op.f("ix_vehicles_device_id"), "vehicles", ["device_id"], unique=True
        )

    if "locations" not in tables:
        # ── locations ───────────────────────────────────────────────────────────
        op.create_table(
            "locations",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("vehicle_id", sa.BigInteger(), nullable=False),
            sa.Column("latitude", sa.Float(precision=9), nullable=False),
            sa.Column("longitude", sa.Float(precision=9), nullable=False),
            sa.Column(
                "timestamp",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_locations_id"), "locations", ["id"], unique=False)
        op.create_index(
            op.f("ix_locations_vehicle_id"), "locations", ["vehicle_id"], unique=False
        )
        # Composite index for fast "latest location per vehicle" queries
        op.create_index(
            "ix_locations_vehicle_timestamp",
            "locations",
            ["vehicle_id", sa.text("timestamp DESC")],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_locations_vehicle_timestamp", table_name="locations")
    op.drop_index(op.f("ix_locations_vehicle_id"), table_name="locations")
    op.drop_index(op.f("ix_locations_id"), table_name="locations")
    op.drop_table("locations")
    op.drop_index(op.f("ix_vehicles_device_id"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_id"), table_name="vehicles")
    op.drop_table("vehicles")
