import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navigation, Loader2, XCircle, Play, Square, AlertCircle, Smartphone, History, ChevronRight, ChevronLeft, Github, Linkedin, Mail } from 'lucide-react'
import { sendPairingRequest, checkPairingStatus, sendLocation, stopLocationTracking, claimVehicleSession, fetchPairingHistory, getAvatarUrl } from '../api/fleetApi'
import { FenceIcon } from '../components/icons/FenceIcon'
import GlobeLoader from '../components/GlobeLoader'
import { useAuth } from '../context/AuthContext'

const INTERVAL_MS = 1000
const POLL_MS = 3000

export default function GPSSender() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const routerLocation = useLocation()
  const [code, setCode] = useState(() => searchParams.get('code') || localStorage.getItem('fleet_account_code') || '')
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState('enter_code') // enter_code, pending, rejected, tracking
  const [isTracking, setIsTracking] = useState(() => localStorage.getItem('fleet_is_tracking') === 'true')
  const [ownerName, setOwnerName] = useState('')
  const [ownerAvatar, setOwnerAvatar] = useState(null)
  const [logs, setLogs] = useState([])
  const [location, setLocation] = useState(null)
  const [pingCount, setPingCount] = useState(0)
  const [vehicleName, setVehicleName] = useState('')
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [simLat, setSimLat] = useState(11.436578)
  const [simLng, setSimLng] = useState(79.533730)

  // Refs for intervals/watchers
  const watchIdRef = useRef(null)
  const intervalIdRef = useRef(null)
  const pollIdRef = useRef(null)
  const lastPosRef = useRef(null)
  const lastPostTimeRef = useRef(0)
  const wakeLockRef = useRef(null)
  const trackingRef = useRef(isTracking)
  const simIntervalRef = useRef(null)
  const logsEndRef = useRef(null)

  // Keep trackingRef in sync with state
  useEffect(() => {
    trackingRef.current = isTracking
  }, [isTracking])
  
  const deviceIdRef = useRef(deviceId)
  useEffect(() => {
    deviceIdRef.current = deviceId
  }, [deviceId])
  
  // Create a unique session ID for this browser tab instance
  const sessionIdRef = useRef(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))

  // Derive a stable device ID from the logged-in user's name + ID.
  // This uses the old format so that previous pairing requests match,
  // preserving history for existing devices.
  useEffect(() => {
    if (user) {
      const safeName = (user.full_name || 'user')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')        // spaces → hyphens
        .replace(/[^a-z0-9-]/g, '')  // strip special chars
        .replace(/-+/g, '-')         // collapse multiple hyphens
        .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
      const id = `${safeName || 'user'}-${user.id}`
      // Clean up any old random device ID from localStorage
      localStorage.removeItem('fleet_device_id')
      setDeviceId(id)
    }
  }, [user])

  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, msg, time }].slice(-20))
  }

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Wake lock management
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          addLog('warn', 'Screen Wake Lock released')
        })
        addLog('info', 'Screen Wake Lock acquired')
      } catch (err) {
        addLog('err', `Wake Lock error: ${err.message}`)
      }
    }
  }

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null
      })
    }
  }

  // Handle visibility changes for wake lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && isTracking) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
      if (pollIdRef.current) clearInterval(pollIdRef.current)
    }
  }, [])

  // Auto-submit code if it's in URL, or auto-resume session on mount
  useEffect(() => {
    if (deviceId && status === 'enter_code') {
      if (code) {
        const urlCode = searchParams.get('code')
        if (urlCode && urlCode === code) {
          submitCode(code)
        } else if (localStorage.getItem('fleet_is_tracking') === 'true' || localStorage.getItem('fleet_account_code')) {
          // If we have a saved session, check status to auto-restore tracking
          checkStatus()
        }
      }
      
      // Fetch history for this device
      fetchPairingHistory(deviceId)
        .then(data => setHistory(data))
        .catch(err => console.error('Failed to load pairing history', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, status]) // run when deviceId is ready or status changes

  const startPolling = () => {
    if (pollIdRef.current) clearInterval(pollIdRef.current)
    pollIdRef.current = setInterval(checkStatus, POLL_MS)
  }

  const stopPolling = () => {
    if (pollIdRef.current) {
      clearInterval(pollIdRef.current)
      pollIdRef.current = null
    }
  }

  const checkStatus = async () => {
    try {
      const data = await checkPairingStatus(deviceId)
      if (data.status === 'approved') {
        stopPolling()
        setVehicleName(data.vehicle_name)
        setOwnerName(data.owner_name || '')
        setOwnerAvatar(data.owner_avatar_url || null)
        setStatus('tracking')
        addLog('ok', `✅ Device approved! Vehicle: ${data.vehicle_name}`)
        
        // Auto-resume tracking if we were tracking before refresh
        if (isTracking) {
          startTracking()
        }
      } else if (data.status === 'rejected') {
        stopPolling()
        setStatus('rejected')
      } else if (data.status === 'none') {
        stopPolling()
        stopTracking()
        setStatus('enter_code')
        localStorage.removeItem('fleet_account_code')
        localStorage.removeItem('fleet_is_tracking')
      }
    } catch (err) {
      // Keep polling on network error
    }
  }

  const submitCode = async (c) => {
    if (!c.trim()) {
      setError('Please enter a code.')
      return
    }
    const upperCode = c.trim().toUpperCase()

    // Block self-pairing: user cannot pair their own account to themselves
    if (user && user.account_code && upperCode === user.account_code.toUpperCase()) {
      setError('This is your own account code. Share it with someone else\'s phone — you cannot track yourself.')
      return
    }

    setError(null)
    setCode(upperCode)

    try {
      const data = await sendPairingRequest(upperCode, deviceId)
      
      // Save code for persistence
      localStorage.setItem('fleet_account_code', upperCode)
      
      if (data.status === 'approved') {
        setStatus('tracking')
        setVehicleName(data.vehicle_name || '')
        setOwnerName(data.owner_name || '')
        setOwnerAvatar(data.owner_avatar_url || null)
        addLog('ok', `✅ Device approved!`)
        startTracking()
      } else if (data.status === 'pending') {
        setStatus('pending')
        startPolling()
      } else if (data.status === 'rejected') {
        setStatus('rejected')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    submitCode(code)
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3
    const p1 = lat1 * Math.PI / 180
    const p2 = lat2 * Math.PI / 180
    const dp = (lat2 - lat1) * Math.PI / 180
    const dl = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(dl / 2) * Math.sin(dl / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const postGPS = async (pos) => {
    if (!trackingRef.current) return
    lastPostTimeRef.current = Date.now()
    const { latitude, longitude, accuracy } = pos.coords
    const timestamp = new Date().toISOString()

    setLocation({ latitude, longitude, accuracy, timestamp })

    const payload = { device_id: deviceId, latitude, longitude, timestamp, session_id: sessionIdRef.current }
    if (code) payload.account_code = code

    try {
      await sendLocation(payload)
      setPingCount(p => {
        const newCount = p + 1
        addLog('ok', `OK — ping #${newCount} (±${Math.round(accuracy)}m)`)
        return newCount
      })
    } catch (err) {
      if (err.message.includes('not approved')) {
        addLog('err', 'Device not approved or deleted')
        stopTracking()
        stopPolling()
        setStatus('enter_code')
      } else if (err.message.includes('another location')) {
        addLog('err', 'Session taken over by another location!')
        stopTracking()
        stopPolling()
        setStatus('enter_code')
        setError('Logged out: This account started sharing location from another device.')
      } else {
        addLog('err', `Network error: ${err.message}`)
      }
    }
  }

  const handleLocationUpdate = (pos) => {
    if (lastPosRef.current) {
      const dist = calculateDistance(
        lastPosRef.current.coords.latitude, lastPosRef.current.coords.longitude,
        pos.coords.latitude, pos.coords.longitude
      )
      if (dist < 5) return // Ignore tiny movements
    }
    lastPosRef.current = pos
    const now = Date.now()
    if (now - lastPostTimeRef.current >= INTERVAL_MS) {
      postGPS(pos)
    }
  }

  const handleLocationError = (err) => {
    const msgs = {
      1: 'Permission denied — allow Location in settings',
      2: 'GPS unavailable — turn ON Location/GPS',
      3: 'GPS request timed out — retrying…'
    }
    addLog('err', msgs[err.code] || 'GPS error')

    if (err.code === 1 || err.code === 2) {
      stopTracking()
      alert(msgs[err.code])
    }
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      addLog('err', 'GPS not supported')
      return
    }

    setIsTracking(true)
    localStorage.setItem('fleet_is_tracking', 'true')

    // Claim the active session for this vehicle
    claimVehicleSession(deviceId, sessionIdRef.current).catch(err => {
      addLog('warn', `Session claim warning: ${err.message}`)
    })

    if (isSimulating) {
      addLog('info', 'Starting simulated GPS movement (dynamic)...')
      let currentLat = simLat
      let currentLng = simLng
      
      let tick = 0
      let phase = 'straight'
      let phaseTicksLeft = 5
      let baseAngle = Math.random() * Math.PI * 2 // Random initial direction
      let speed = 0.0003
      
      simIntervalRef.current = setInterval(() => {
        tick++
        if (phaseTicksLeft <= 0) {
          // Switch phase randomly
          const phases = ['straight', 'curve', 'zigzag']
          phase = phases[Math.floor(Math.random() * phases.length)]
          phaseTicksLeft = Math.floor(Math.random() * 15) + 10 // 10 to 25 seconds per phase
          baseAngle += (Math.random() - 0.5) * Math.PI // Change general direction slightly
          addLog('info', `Simulation phase changed to: ${phase}`)
        }
        
        let currentAngle = baseAngle
        if (phase === 'curve') {
          // Smooth sine wave over base angle (Snake)
          currentAngle = baseAngle + Math.sin(tick * 0.3) * 1.5
        } else if (phase === 'zigzag') {
          // Sharp alternating angle
          currentAngle = baseAngle + ((tick % 6 < 3) ? 1.0 : -1.0)
        } else {
          // Straight line with very slight drift
          currentAngle = baseAngle + Math.sin(tick * 0.1) * 0.1
        }
        
        // Move according to angle
        currentLat += Math.sin(currentAngle) * speed
        // Multiply Lng by a factor to account for projection distortion slightly if we wanted, but not strictly necessary for fake data
        currentLng += Math.cos(currentAngle) * speed
        
        phaseTicksLeft--
        
        setSimLat(currentLat)
        setSimLng(currentLng)
        handleLocationUpdate({ coords: { latitude: currentLat, longitude: currentLng, accuracy: 5 } })
      }, INTERVAL_MS)
      return
    }

    addLog('info', 'Acquiring high-precision GPS…')

    // Force prompt/location fetch before watching
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!trackingRef.current) return // User cancelled before lock
        handleLocationUpdate(pos)
        
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationUpdate,
          handleLocationError,
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        )

        intervalIdRef.current = setInterval(() => {
          if (lastPosRef.current) postGPS(lastPosRef.current)
        }, INTERVAL_MS)
      },
      (err) => {
        handleLocationError(err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    requestWakeLock()
  }

  const stopTracking = () => {
    setIsTracking(false)
    localStorage.setItem('fleet_is_tracking', 'false')
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
    }

    const currentDeviceId = deviceIdRef.current || deviceId;
    if (currentDeviceId) {
      stopLocationTracking({ device_id: currentDeviceId, session_id: sessionIdRef.current }).catch(err => {
        addLog('warn', `Failed to notify server: ${err.message}`)
      })
    }

    addLog('info', 'Tracking stopped.')
    releaseWakeLock()
  }

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking()
    } else {
      startTracking()
    }
  }

  if (!user) {
    const returnTo = encodeURIComponent(routerLocation.pathname + routerLocation.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 bg-slate-50 dark:bg-slate-950 transition-colors min-h-full"
    >
      <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-4">

          {status === 'enter_code' && (
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary dark:text-[#17b385] rounded flex items-center justify-center mx-auto mb-3">
                <Navigation size={24} />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Connect Device</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the 6-digit code from your dashboard.</p>
            </div>

            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                required
                placeholder="FLT-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-center text-lg font-mono font-bold tracking-widest uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-4 py-3 mb-4 focus:outline-none focus:border-brand-primary text-slate-900 dark:text-white transition-colors"
              />
              {error && (
                <div className="mb-4 text-xs text-rose-600 text-center bg-rose-50 border border-rose-200 p-2 rounded">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-bold text-sm py-3 rounded transition-colors shadow-sm cursor-pointer"
              >
                Pair Device
              </button>
            </form>
            
            {history.length > 0 && (
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
                  <History size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Previously Connected</h3>
                </div>
                <div className="space-y-3">
                  {history.map((owner) => (
                    <button
                      key={owner.id}
                      onClick={() => {
                        setCode(owner.account_code)
                        submitCode(owner.account_code)
                      }}
                      className="w-full flex items-center justify-between p-3 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                          {owner.avatar_url ? (
                            <img src={getAvatarUrl(owner.avatar_url)} alt={owner.full_name} className="w-full h-full object-cover" />
                          ) : (
                            (owner.full_name || 'Fleet')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {owner.full_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {owner.account_code}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-brand-primary dark:group-hover:text-[#17b385] transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800/50 p-6 shadow-sm text-center transition-colors">
            <GlobeLoader className="w-8 h-8 mx-auto mb-3 opacity-80" />
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-500 mb-1">Waiting for approval…</h2>
            <p className="text-xs text-amber-700 dark:text-amber-400">The account owner needs to approve this device.</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-300 font-mono mt-4">Device ID: {deviceId}</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded border border-rose-200 dark:border-rose-800/50 p-6 shadow-sm text-center transition-colors">
            <XCircle size={32} className="text-rose-500 dark:text-rose-400 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-500 mb-1">Request Rejected</h2>
            <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">The account owner rejected your pairing request.</p>
            <button
              onClick={() => { setStatus('enter_code'); setCode(''); localStorage.removeItem('fleet_account_code'); localStorage.removeItem('fleet_is_tracking') }}
              className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 font-bold text-xs py-2 px-4 rounded hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors cursor-pointer shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'tracking' && (
          <div className="space-y-4">
            {!isTracking && (
              <button
                onClick={() => { 
                  setStatus('enter_code'); 
                  setCode(''); 
                  localStorage.removeItem('fleet_account_code'); 
                  localStorage.removeItem('fleet_is_tracking');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-2 cursor-pointer"
              >
                <ChevronLeft size={16} /> Back to Connect
              </button>
            )}
            <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Sending to</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                      {ownerAvatar ? (
                        <img src={getAvatarUrl(ownerAvatar)} alt="Owner" className="w-full h-full object-cover" />
                      ) : (
                        (ownerName || 'Fleet')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{ownerName || 'Fleet Account'}</p>
                      <p className="text-xs text-brand-primary dark:text-[#17b385] font-semibold">{vehicleName}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Status</p>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold transition-colors ${isTracking ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`}></span>
                  {isTracking ? 'Live Streaming' : 'Paused'}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Pings Sent</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{pingCount}</p>
              </div>

              {location ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Coordinates</p>
                    <p className="text-xs font-mono text-slate-700 dark:text-white">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Accuracy</p>
                    <p className="text-xs font-mono text-slate-700 dark:text-white">±{Math.round(location.accuracy)}m</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 italic">
                  Waiting for GPS lock...
                </div>
              )}
            </div>
            
            {!isTracking && user?.email === 'donaga7559@archifun.com' && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSimulating}
                    onChange={(e) => setIsSimulating(e.target.checked)}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  Simulate Movement (Testing Mode)
                </label>
                {isSimulating && (
                  <div className="mt-2 text-xs text-slate-500">
                    Will start at {simLat.toFixed(4)}, {simLng.toFixed(4)} and move Northeast.
                  </div>
                )}
              </div>
            )}

            <button
              onClick={toggleTracking}
              className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded transition-colors shadow-sm text-white cursor-pointer ${isTracking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90'}`}
            >
              {isTracking ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isTracking ? 'Stop Sharing' : 'Start Sharing Location'}
            </button>

            <div className="bg-slate-100 dark:bg-slate-900 rounded p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {logs.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">System ready. Waiting to start...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={`break-words ${
                      log.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' :
                      log.type === 'err' ? 'text-rose-600 dark:text-rose-400' :
                      log.type === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                      'text-slate-700 dark:text-slate-300'
                    }`}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded p-3 flex items-start gap-2 transition-colors">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-snug text-left">
                <strong>Keep this tab open!</strong> Mobile browsers pause GPS when minimized. For background tracking, leave screen on.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 w-full bg-slate-50 dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 py-4 flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-auto">
        <div className="flex items-center gap-4">
          <a href="https://github.com/GowthamSankar-dev" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="GitHub">
            <Github size={18} />
          </a>
          <a href="https://www.linkedin.com/in/gowtham-sankar-b141b6351/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="LinkedIn">
            <Linkedin size={18} />
          </a>
          <a href="mailto:gowthamsankarjayaraman@gmail.com" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="Email">
            <Mail size={18} />
          </a>
        </div>
        <p className="text-[11px]">&copy; {new Date().getFullYear()} myfleetOS. All rights reserved.</p>
      </footer>
    </motion.div>
  )
}
