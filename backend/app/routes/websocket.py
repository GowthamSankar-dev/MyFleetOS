"""
WebSocket route — dashboard clients connect here to receive live updates.

WS /ws
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Dashboard clients connect to this endpoint.

    - On connect: accepted and added to the broadcast pool.
    - On message: echo back (ping/pong, optional).
    - On disconnect: gracefully removed from the pool.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; clients can optionally send pings
            data = await websocket.receive_text()
            # Optional: echo the message back (useful for debugging)
            await websocket.send_text(f"echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected normally.")
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
        manager.disconnect(websocket)
