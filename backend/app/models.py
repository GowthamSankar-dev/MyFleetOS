"""
ORM models — User, Vehicle, Location, and PairingRequest tables.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, String, Float, DateTime, ForeignKey, func, JSON, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def generate_pairing_code() -> str:
    """Generate a unique 8-character pairing code like TRK-A1B2."""
    return f"TRK-{uuid.uuid4().hex[:6].upper()}"


def generate_share_code() -> str:
    """Generate a unique 8-character public share code like SHR-X9Y8."""
    return f"SHR-{uuid.uuid4().hex[:6].upper()}"


def generate_account_code() -> str:
    """Generate a unique 6-digit account code like FLT-A3B9C2."""
    return f"FLT-{uuid.uuid4().hex[:6].upper()}"


class User(Base):
    """Represents a registered user account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False, default="Fleet Owner")
    avatar_url: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Unique account-level pairing code — phones use this to request access
    account_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=generate_account_code, nullable=False
    )

    # Role: 'owner' (manages fleet) or 'driver' (sends GPS only)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default='owner')

    # Vehicles owned by this user
    vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", foreign_keys="[Vehicle.user_id]", back_populates="user", cascade="all, delete-orphan"
    )

    # Pairing requests sent to this user
    pairing_requests: Mapped[list["PairingRequest"]] = relationship(
        "PairingRequest", foreign_keys="[PairingRequest.user_id]", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} code={self.account_code!r}>"


class Vehicle(Base):
    """Represents a tracked device / vehicle."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="My Vehicle")
    vehicle_type: Mapped[str] = mapped_column(String(32), nullable=False, default="car")
    active_session_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # User ownership (optional for legacy/unclaimed vehicles)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Unique private pairing code for QR scanning & phone binding
    pairing_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=generate_pairing_code, nullable=False
    )

    # Unique share code for public shareable tracking links
    share_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=generate_share_code, nullable=False
    )

    # Driver (sender) of the vehicle
    driver_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Assigned Geofence
    geofence_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("geofences.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id], back_populates="vehicles")
    driver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[driver_id])
    geofence: Mapped[Optional["Geofence"]] = relationship("Geofence", back_populates="vehicles")
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} name={self.name!r} code={self.pairing_code!r}>"


class Geofence(Base):
    """Represents a geofence zone drawn on the map."""

    __tablename__ = "geofences"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="#17b385", server_default="#17b385", nullable=False)
    coordinates: Mapped[list] = mapped_column(JSON, nullable=False)  # stores array of {lat, lng} or [lng, lat]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    vehicles: Mapped[list["Vehicle"]] = relationship("Vehicle", back_populates="geofence")

    def __repr__(self) -> str:
        return f"<Geofence id={self.id} name={self.name!r}>"


class Location(Base):
    """Stores a single GPS ping for a vehicle."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latitude: Mapped[float] = mapped_column(Float(precision=9), nullable=False)
    longitude: Mapped[float] = mapped_column(Float(precision=9), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship back to vehicle
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="locations")

    def __repr__(self) -> str:
        return (
            f"<Location id={self.id} vehicle_id={self.vehicle_id} "
            f"lat={self.latitude} lon={self.longitude}>"
        )


class PairingRequest(Base):
    """A request from a phone to pair with a user's account."""

    __tablename__ = "pairing_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    sender_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending"
    )  # pending / approved / rejected
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="pairing_requests")
    sender: Mapped[Optional["User"]] = relationship("User", foreign_keys=[sender_id])
    vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle")

    def __repr__(self) -> str:
        return (
            f"<PairingRequest id={self.id} device={self.device_id!r} "
            f"status={self.status!r}>"
        )


class OTPCode(Base):
    """Stores one-time passwords for login and password reset."""

    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(String(16), nullable=False) # 'login' or 'reset'
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<OTPCode id={self.id} email={self.email!r} purpose={self.purpose!r}>"

