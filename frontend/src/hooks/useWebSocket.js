import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = (() => {
  let base = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL;
  if (base) {
    let wsBase = base.replace(/^http/, 'ws');
    if (!wsBase.startsWith('ws')) {
      wsBase = `wss://${wsBase}`;
    }
    wsBase = wsBase.replace(/\/$/, '');
    if (!wsBase.endsWith('/ws')) {
      wsBase += '/ws';
    }
    console.log('[WS] Calculated WS_URL:', wsBase);
    return wsBase;
  }
  return 'ws://localhost:8000/ws';
})();
const RECONNECT_DELAY_MS = 3000

/**
 * useWebSocket — manages a WebSocket connection to the Fleet backend.
 *
 * Returns:
 *   - lastMessage: the most recent parsed JSON payload from the server
 *   - isConnected: boolean connection status
 *   - reconnect: function to manually force reconnect
 */
export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const shouldReconnect = useRef(true)

  const connect = useCallback(() => {
    // Don't open a second connection if already open
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        console.log('[WS] Connected to Fleet backend')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'location_update' || data.event === 'device_offline' || data.event === 'geofence_alert') {
            setLastMessage(data)
          }
        } catch (err) {
          console.warn('[WS] Could not parse message:', event.data)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        console.log(`[WS] Disconnected (code=${event.code}). Reconnecting in ${RECONNECT_DELAY_MS}ms…`)

        if (shouldReconnect.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = (err) => {
        console.error('[WS] Error:', err)
        ws.close()
      }
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }, [])

  useEffect(() => {
    shouldReconnect.current = true
    connect()

    return () => {
      shouldReconnect.current = false
      clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const reconnect = useCallback(() => {
    wsRef.current?.close()
    connect()
  }, [connect])

  return { lastMessage, isConnected, reconnect }
}
