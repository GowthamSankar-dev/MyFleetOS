"""
Pydantic schemas — request/response data transfer objects.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ── Auth schemas ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """User registration payload."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")
    full_name: str = Field(default="Fleet Owner", description="Display name")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    role: str = Field(default="owner", description="Account role: 'owner' or 'driver'")


class UserLogin(BaseModel):
    """User login payload."""
    email: str
    password: str


class OTPRequest(BaseModel):
    """Payload to request an OTP (for login or password reset)."""
    email: str = Field(..., description="User email address")


class OTPVerifyLogin(BaseModel):
    """Payload to verify an OTP for login."""
    email: str
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class OTPVerifyReset(BaseModel):
    """Payload to verify an OTP for password reset."""
    email: str
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    new_password: str = Field(..., min_length=6, description="New user password (min 6 chars)")


class PasswordChangeOTPRequest(BaseModel):
    """Payload to request an OTP for password change."""
    current_password: str = Field(..., description="Current password")


class PasswordChangeRequest(BaseModel):
    """Payload to change password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, description="New password (min 6 chars)")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    email: str
    full_name: str
    avatar_url: str | None = None
    created_at: datetime
    account_code: str
    role: str = 'owner'

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT Token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Location schemas ────────────────────────────────────────────────────────

class LocationStop(BaseModel):
    """Payload sent by mobile app or web tracker to stop tracking."""
    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device identifier")
    session_id: str | None = Field(default=None, description="Session UUID to prevent spoofing")

class LocationCreate(BaseModel):
    """Payload sent by mobile app or web tracker to POST /location."""

    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device identifier")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude")
    pairing_code: str | None = Field(default=None, description="Optional private pairing code (TRK-XXXX)")
    account_code: str | None = Field(default=None, description="Optional account code (FLT-XXXXXX) for new pairing flow")
    session_id: str | None = Field(default=None, description="Session UUID to prevent spoofing")
    timestamp: datetime | None = Field(
        default=None,
        description="Device timestamp (UTC). Server time used if omitted.",
    )

    @field_validator("device_id")
    @classmethod
    def strip_device_id(cls, v: str) -> str:
        return v.strip()


class LocationResponse(BaseModel):
    """Single location record returned to the client."""

    id: int
    vehicle_id: int
    latitude: float
    longitude: float
    timestamp: datetime

    model_config = {"from_attributes": True}


# ── Vehicle schemas ─────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    """Payload to create a new vehicle for logged-in user."""
    name: str = Field(..., min_length=1, max_length=128, description="Vehicle name e.g. My Car")
    vehicle_type: str = Field(default="car", description="Type of vehicle (car, truck, motorcycle, bus)")
    device_id: str | None = Field(default=None, description="Optional pre-assigned device ID")


class DriverInfo(BaseModel):
    """Basic user info returned when they are driving/sending GPS."""
    id: int
    full_name: str
    avatar_url: str | None = None
    
    model_config = {"from_attributes": True}


class VehicleResponse(BaseModel):
    """Vehicle info returned to the client."""

    id: int
    device_id: str
    name: str
    vehicle_type: str
    pairing_code: str
    share_code: str
    user_id: int | None = None
    driver: DriverInfo | None = None
    active_session_id: str | None = None
    geofence_id: int | None = None

    model_config = {"from_attributes": True}


class VehicleDetail(VehicleResponse):
    """Vehicle info plus its latest location."""

    latest_location: LocationResponse | None = None


class VehicleUpdate(BaseModel):
    """Payload to update an existing vehicle."""
    name: str | None = Field(default=None, min_length=1, max_length=128)
    vehicle_type: str | None = Field(default=None, description="Type of vehicle (car, truck, motorcycle, bus)")


# ── Geofence schemas ─────────────────────────────────────────────────────────

class Coordinate(BaseModel):
    lat: float
    lng: float

class GeofenceCreate(BaseModel):
    """Payload to create a new geofence."""
    name: str = Field(..., max_length=128)
    color: str = Field(default="#17b385", max_length=32)
    coordinates: list[Coordinate] = Field(..., min_length=3, description="List of coordinates forming the polygon")

class GeofenceResponse(BaseModel):
    """Geofence response model."""
    id: int
    user_id: int
    name: str
    color: str
    coordinates: list[Coordinate]
    created_at: datetime

    model_config = {"from_attributes": True}

class VehicleGeofenceAssign(BaseModel):
    """Payload to assign a vehicle to a geofence."""
    geofence_id: int | None = Field(default=None, description="Geofence ID to assign, or null to remove")

# ── Pairing Request schemas ─────────────────────────────────────────────────

class PairingRequestCreate(BaseModel):
    """Payload from GPS sender to request pairing with an account."""
    account_code: str = Field(..., min_length=1, description="The 6-digit account code (FLT-XXXXXX)")
    device_id: str = Field(..., min_length=1, max_length=64, description="Phone's unique device ID")

    @field_validator("account_code")
    @classmethod
    def normalize_account_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("device_id")
    @classmethod
    def strip_device(cls, v: str) -> str:
        return v.strip()


class PairingRequestResponse(BaseModel):
    """Pairing request info returned to client."""
    id: int
    user_id: int
    device_id: str
    status: str
    vehicle_id: int | None = None
    vehicle_name: str | None = None
    owner_name: str | None = None
    owner_avatar_url: str | None = None
    sender_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PairingApprovePayload(BaseModel):
    """Payload to approve a pairing request with a vehicle name."""
    vehicle_name: str = Field(
        default="My Vehicle",
        min_length=1,
        max_length=128,
        description="Name for the new vehicle",
    )


class PairingCheckResponse(BaseModel):
    """Response for GPS sender polling to check pairing status."""
    status: str  # pending / approved / rejected
    vehicle_name: str | None = None
    owner_name: str | None = None
    owner_avatar_url: str | None = None
    message: str


class ConnectedOwner(BaseModel):
    """Previously connected owner for a device."""
    id: int
    full_name: str
    avatar_url: str | None = None
    account_code: str
    
    model_config = {"from_attributes": True}


# ── WebSocket broadcast payload ─────────────────────────────────────────────

class LocationBroadcast(BaseModel):
    """Shape of the JSON pushed to all WebSocket clients."""

    event: str = "location_update"
    device_id: str
    vehicle_id: int
    vehicle_name: str
    vehicle_type: str
    latitude: float
    longitude: float
    timestamp: datetime
    pairing_code: str | None = None
    share_code: str | None = None
