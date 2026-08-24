"""
Location routes.

POST /location   — receive a GPS ping from the mobile app
                   and broadcast it to all WebSocket clients.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import LocationCreate, LocationResponse, LocationStop
from app.services import record_location, get_matched_location_data, get_vehicle_for_approved_device
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/location", tags=["Location"])


@router.post(
    "",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive a GPS ping from the mobile app",
)
async def post_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Called every 5 seconds by the Android app.

    1. Verify device is approved.
    2. Insert a new location row.
    3. Broadcast the update to all connected WebSocket clients.
    4. Return the saved location object.
    """
    try:
        vehicle, location = await record_location(db, payload)
    except ValueError as exc:
        # Device not approved — clear message to GPS sender
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to record location: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record location.",
        )

    broadcast_payload = {
        "event": "location_update",
        "device_id": vehicle.device_id,
        "vehicle_id": vehicle.id,
        "vehicle_name": vehicle.name,
        "vehicle_type": vehicle.vehicle_type,
        "driver_avatar_url": vehicle.driver.avatar_url if vehicle.driver else None,
        "active_session_id": vehicle.active_session_id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timestamp": location.timestamp.isoformat(),
    }
    
    try:
        match_data = await get_matched_location_data(db, vehicle, location)
        broadcast_payload.update(match_data)
    except Exception as exc:
        logger.warning("Map matching failed, falling back to raw coords: %s", exc)
    await manager.broadcast(broadcast_payload)
    logger.info(
        "Location recorded and broadcast | device=%s lat=%.6f lon=%.6f",
        vehicle.device_id,
        location.latitude,
        location.longitude,
    )

    return location


@router.post(
    "/stop",
    status_code=status.HTTP_200_OK,
    summary="Stop GPS tracking from the mobile app",
)
async def post_location_stop(
    payload: LocationStop,
    db: AsyncSession = Depends(get_db),
):
    """
    Called when the Android app stops tracking.
    Broadcasts an offline event to WebSocket clients.
    """
    vehicle = await get_vehicle_for_approved_device(db, payload.device_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found or not approved",
        )
    
    # Check for session conflict
    if payload.session_id and vehicle.active_session_id:
        if payload.session_id != vehicle.active_session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Logged in from another location",
            )
            
    # Broadcast device offline event
    
    # Close tracking session if active
    from sqlalchemy import select
    from app.models import TrackingSession
    from datetime import datetime, timezone
    
    if vehicle.active_tracking_session_id:
        active_session = await db.execute(
            select(TrackingSession).where(TrackingSession.id == vehicle.active_tracking_session_id)
        )
        active_session = active_session.scalar_one_or_none()
        if active_session:
            active_session.end_time = datetime.now(timezone.utc)
            active_session.status = "completed"
        vehicle.active_tracking_session_id = None
        
    vehicle.active_session_id = None
    await db.commit()

    broadcast_payload = {
        "event": "device_offline",
        "device_id": vehicle.device_id,
        "vehicle_id": vehicle.id,
    }
    
    await manager.broadcast(broadcast_payload)
    logger.info("Tracking stopped and broadcast | device=%s", vehicle.device_id)
    
    return {"status": "ok"}


