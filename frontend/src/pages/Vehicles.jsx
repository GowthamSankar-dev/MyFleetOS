import { Truck, MapPin, Clock, Smartphone, Car, Bike, Bus, Edit2, Shield, Check, X, RefreshCw, Activity, Calendar, Play, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { formatDistanceToNow, format, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useCallback, useEffect, Fragment } from 'react'
import { fetchPairingRequests, approvePairingRequest, rejectPairingRequest, fetchVehicleSessions, updateVehicleSession, deleteVehicleSession, deleteVehicle } from '../api/fleetApi'
import EditVehicleModal from '../components/EditVehicleModal'
import DeleteVehicleModal from '../components/DeleteVehicleModal'
import PlaybackModal from '../components/PlaybackModal'
import ConfirmModal from '../components/ConfirmModal'
import { useTheme } from '../context/ThemeContext'
import GlobeLoader from '../components/GlobeLoader'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Vehicles page — simple clean table view of all tracked devices.
 */
export default function Vehicles({ vehicles, locations, isLoading, isConnected, lastMessage, onToggleMobileMenu, onRefresh }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const query = (searchQuery || '').toLowerCase();
  const filteredVehicles = (vehicles || []).filter(v => 
    (v.name || '').toLowerCase().includes(query) || 
    (v.device_id || '').toLowerCase().includes(query)
  );

  const [requests, setRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [requestsError, setRequestsError] = useState(null)
  const [approveId, setApproveId] = useState(null)
  const [vehicleName, setVehicleName] = useState('')
  const [processing, setProcessing] = useState(null)

  const [expandedVehicleId, setExpandedVehicleId] = useState(null)
  const [vehicleSessions, setVehicleSessions] = useState({})
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [activePlaybackSession, setActivePlaybackSession] = useState(null)
  
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editingSessionName, setEditingSessionName] = useState('')
  const [isProcessingSession, setIsProcessingSession] = useState(null)
  const [sessionToDelete, setSessionToDelete] = useState(null)

  const handleToggleExpand = async (vehicleId) => {
    if (expandedVehicleId === vehicleId) {
      setExpandedVehicleId(null)
      return
    }
    setExpandedVehicleId(vehicleId)
    if (!vehicleSessions[vehicleId]) {
      setIsLoadingSessions(true)
      try {
        const data = await fetchVehicleSessions(vehicleId)
        setVehicleSessions(prev => ({ ...prev, [vehicleId]: data }))
      } catch (err) {
        console.error("Failed to fetch sessions:", err)
      } finally {
        setIsLoadingSessions(false)
      }
    }
  }

  // Handle expanding from navigation state
  useEffect(() => {
    if (location.state?.expandVehicleId && vehicles.length > 0) {
      const vid = location.state.expandVehicleId
      if (expandedVehicleId !== vid) {
        setExpandedVehicleId(vid)
        if (!vehicleSessions[vid]) {
          setIsLoadingSessions(true)
          fetchVehicleSessions(vid).then(data => {
            setVehicleSessions(prev => ({ ...prev, [vid]: data }))
          }).catch(err => {
            console.error("Failed to fetch sessions:", err)
          }).finally(() => {
            setIsLoadingSessions(false)
          })
        }
      }
      // Clear the state so it doesn't re-trigger
      navigate('.', { replace: true, state: {} })
    }
  }, [location.state, vehicles, expandedVehicleId, vehicleSessions, navigate])

  const handlePlayback = (session) => {
    setActivePlaybackSession(session)
  }

  const handleDeleteSessionClick = (e, vehicleId, sessionId) => {
    e.stopPropagation()
    setSessionToDelete({ vehicleId, sessionId })
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return
    const { vehicleId, sessionId } = sessionToDelete
    setIsProcessingSession(sessionId)
    try {
      await deleteVehicleSession(vehicleId, sessionId)
      setVehicleSessions(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId].filter(s => s.id !== sessionId)
      }))
    } catch (err) {
      alert('Failed to delete session: ' + err.message)
    } finally {
      setIsProcessingSession(null)
      setSessionToDelete(null)
    }
  }

  const handleSaveSessionName = async (e, vehicleId, sessionId) => {
    e.stopPropagation()
    if (!editingSessionName.trim()) {
      setEditingSessionId(null)
      return
    }
    
    setIsProcessingSession(sessionId)
    try {
      const updated = await updateVehicleSession(vehicleId, sessionId, { name: editingSessionName })
      setVehicleSessions(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId].map(s => s.id === sessionId ? updated : s)
      }))
      setEditingSessionId(null)
    } catch (err) {
      alert('Failed to rename session: ' + err.message)
    } finally {
      setIsProcessingSession(null)
    }
  }

  const handleConfirmDelete = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId)
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to delete vehicle: ' + err.message)
      throw err 
    }
  }

  const loadRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true)
      setRequestsError(null)
      const data = await fetchPairingRequests()
      setRequests(data)
    } catch (err) {
      setRequestsError(err.message)
    } finally {
      setIsLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 10000)
    return () => clearInterval(interval)
  }, [loadRequests])

  const handleApprove = async (requestId) => {
    if (!vehicleName.trim()) return
    setProcessing(requestId)
    try {
      await approvePairingRequest(requestId, vehicleName.trim())
      setApproveId(null)
      setVehicleName('')
      await loadRequests()
      if (onRefresh) onRefresh()
      if (pendingRequests.length <= 1) {
        setIsRequestsModalOpen(false)
      }
    } catch (err) {
      alert('Failed to approve: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId) => {
    setProcessing(requestId)
    try {
      await rejectPairingRequest(requestId)
      await loadRequests()
      if (pendingRequests.length <= 1) {
        setIsRequestsModalOpen(false)
      }
    } catch (err) {
      alert('Failed to reject: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'truck': return <Truck size={14} className="text-brand-primary dark:text-[#17b385] shrink-0" />
      case 'motorcycle': return <Bike size={14} className="text-brand-primary dark:text-[#17b385] shrink-0" />
      case 'bus': return <Bus size={14} className="text-brand-primary dark:text-[#17b385] shrink-0" />
      case 'car':
      default: return <Car size={14} className="text-brand-primary dark:text-[#17b385] shrink-0" />
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 transition-colors"
    >

      {/* ── Sessions Expanded View Component ── */}
      {(() => {
        const renderSessions = (vehicleId) => {
          const sessions = vehicleSessions[vehicleId]
          if (isLoadingSessions && !sessions) {
            return <p className="text-[11px] text-slate-400 italic py-2">Loading sessions...</p>
          }
          if (!sessions || sessions.length === 0) {
            return <p className="text-[11px] text-slate-400 italic py-2">No tracking sessions found.</p>
          }
          return (
            <div className="max-h-[220px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessions.map(session => {
                const startDate = new Date(session.start_time)
                const endDate = session.end_time ? new Date(session.end_time) : new Date()
                const mins = differenceInMinutes(endDate, startDate)
                const secs = differenceInSeconds(endDate, startDate) % 60
                const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
                
                return (
                  <div key={session.id} className="flex flex-col bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 w-full pr-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input 
                              type="text" 
                              autoFocus
                              value={editingSessionName}
                              onChange={e => setEditingSessionName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveSessionName(e, vehicleId, session.id)
                                if (e.key === 'Escape') setEditingSessionId(null)
                              }}
                              className="bg-slate-100 dark:bg-slate-800 border border-brand-primary/50 rounded px-1.5 py-0.5 text-xs w-full focus:outline-none text-slate-900 dark:text-white"
                            />
                            <button onClick={(e) => handleSaveSessionName(e, vehicleId, session.id)} disabled={isProcessingSession === session.id} className="text-brand-primary hover:text-brand-accent px-1">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingSessionId(null)} className="text-slate-400 hover:text-slate-600 px-1">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 overflow-hidden group w-full cursor-text" onClick={(e) => {
                            e.stopPropagation()
                            setEditingSessionId(session.id)
                            setEditingSessionName(session.name || format(startDate, 'MMM d, yyyy'))
                          }}>
                            <span className="truncate" title="Click to rename">{session.name || format(startDate, 'MMM d, yyyy')}</span>
                            <Edit2 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                      {!editingSessionId && (
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-bold tracking-wide ${session.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {session.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400 shrink-0"/> 
                          <span>{format(startDate, 'h:mm a')} - {session.end_time ? format(endDate, 'h:mm a') : 'Now'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity size={12} className="text-slate-400 shrink-0"/>
                          <span>Duration: <span className="text-slate-700 dark:text-slate-300 font-semibold">{durationStr}</span></span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {session.status === 'completed' && (
                          <button
                            onClick={(e) => handleDeleteSessionClick(e, vehicleId, session.id)}
                            disabled={isProcessingSession === session.id}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                            title="Delete session"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlayback(session)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 text-brand-primary dark:bg-[#17b385]/10 dark:text-[#17b385] hover:bg-brand-primary/20 dark:hover:bg-[#17b385]/20 rounded text-[11px] font-bold transition-colors cursor-pointer ml-1"
                        >
                          <Play size={12} className="fill-current" />
                          Playback
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )
        }
        
        window.renderSessions = renderSessions
      })()}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <GlobeLoader className="w-10 h-10 mb-3 opacity-70" />
            <p className="text-sm">Loading vehicles list…</p>
          </div>
        ) : (
          <>
            {/* ── Stats bar ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
              {[
                { label: 'Total Vehicles', value: vehicles.length, icon: Truck },
                { label: 'With Location', value: Object.keys(locations).length, icon: MapPin },
                { label: 'Active (5 min)', value: Object.values(locations).filter(l =>
                    Date.now() - new Date(l.timestamp).getTime() < 5 * 60 * 1000
                  ).length, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-sm hover:border-brand-primary dark:hover:border-[#17b385] transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={14} className="text-brand-primary dark:text-[#17b385]" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* ── Table Header & Button ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-3 gap-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white shrink-0">Vehicles List</h3>
              
              <div className="flex-1 relative hidden sm:block mx-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] transition-colors"
                />
              </div>

              <button 
                onClick={() => setIsRequestsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm shrink-0"
              >
                <Shield size={14} className={pendingRequests.length > 0 ? "text-amber-500" : "text-slate-400"} />
                Pairing Requests {pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}
              </button>
            </div>
            
            {/* Mobile Search Bar */}
            <div className="sm:hidden relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] transition-colors"
              />
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            {filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 shadow-sm transition-colors">
                <Truck size={36} className="mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No vehicles registered</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Wait for device pairing requests to add vehicles to your fleet.</p>
              </div>
            ) : (
              <>
                {/* ── Desktop Table View ──────────────────────────────────────── */}
                <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm overflow-hidden transition-colors">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px] table-fixed">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
                        {[
                          { label: '#', width: 'w-[8%]' },
                          { label: 'Name', width: 'w-[25%]' },
                          { label: 'Coordinates', width: 'w-[22%]' },
                          { label: 'Last Seen', width: 'w-[20%]' },
                          { label: 'Status', width: 'w-[15%]' },
                          { label: 'Actions', width: 'w-[10%]' }
                        ].map((h) => (
                          <th key={h.label} className={`px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${h.width}`}>
                            {h.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredVehicles.map((v, index) => {
                        const loc = locations[v.id]
                        const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                        return (
                          <Fragment key={v.id}>
                            <tr 
                              onClick={() => handleToggleExpand(v.id)}
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${expandedVehicleId === v.id ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}
                            >
                              {/* ID */}
                              <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                  {expandedVehicleId === v.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400 opacity-50 group-hover:opacity-100" />}
                                  {index + 1}
                                </div>
                              </td>

                              {/* Name */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {getVehicleIcon(v.vehicle_type)}
                                  <span className="font-semibold text-slate-900 dark:text-white truncate" title={v.name}>{v.name}</span>
                                </div>
                              </td>

                              {/* Coordinates */}
                              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {loc
                                  ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                                  : <span className="text-slate-400 dark:text-slate-500 italic">No data</span>}
                              </td>

                              {/* Last Seen */}
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {loc
                                  ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })
                                  : '—'}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium ${
                                  isActive
                                    ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30 dark:bg-[#17b385]/10 dark:text-[#17b385] dark:border-[#17b385]/30'
                                    : loc
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50'
                                }`}>
                                  <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} style={{ width: 6, height: 6 }} />
                                  {isActive ? 'Active' : loc ? 'Idle' : 'No Signal'}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingVehicle(v)
                                    }}
                                    className="p-1.5 rounded text-slate-400 hover:text-brand-primary dark:hover:text-[#17b385] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Edit Vehicle"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeletingVehicle(v)
                                    }}
                                    className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                                    title="Delete Vehicle"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {expandedVehicleId === v.id && (
                                <tr className="bg-slate-50 dark:bg-slate-800/30">
                                  <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-slate-800">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="p-4 pl-12 border-t border-slate-100 dark:border-slate-700/50">
                                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                          <Activity size={14} />
                                          Tracking Sessions
                                        </h4>
                                        {window.renderSessions(v.id)}
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* ── Mobile Card View ────────────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-3">
                  {filteredVehicles.map((v) => {
                    const loc = locations[v.id]
                    const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                    return (
                      <div 
                        key={v.id} 
                        onClick={() => handleToggleExpand(v.id)}
                        className={`bg-white dark:bg-slate-900 border ${expandedVehicleId === v.id ? 'border-brand-primary dark:border-[#17b385]' : 'border-slate-200 dark:border-slate-800'} rounded shadow-sm flex flex-col hover:border-brand-primary dark:hover:border-[#17b385] transition-colors cursor-pointer overflow-hidden`}
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getVehicleIcon(v.vehicle_type)}
                              <span className="font-bold text-slate-900 dark:text-white">{v.name}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isActive
                                ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30 dark:bg-[#17b385]/10 dark:text-[#17b385] dark:border-[#17b385]/30'
                                : loc
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50'
                            }`}>
                              <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} style={{ width: 6, height: 6 }} />
                              {isActive ? 'Active' : loc ? 'Idle' : 'No Signal'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col text-xs mt-1">
                            <span className="text-slate-400 dark:text-slate-500">Last Seen</span>
                            <span className="text-slate-700 dark:text-slate-300">{loc ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true }) : '—'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <MapPin size={12} />
                              <span className="font-mono">{loc ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : 'No data'}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingVehicle(v)
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-brand-primary dark:hover:text-[#17b385] bg-slate-50 dark:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Vehicle"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedVehicleId === v.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800"
                            >
                              <div className="p-4">
                                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Activity size={14} />
                                  Tracking Sessions
                                </h4>
                                {window.renderSessions(v.id)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <EditVehicleModal
        isOpen={!!editingVehicle}
        vehicle={editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onVehicleUpdated={() => {
          if (onRefresh) onRefresh()
          setEditingVehicle(null)
        }}
      />

      {/* ── Pairing Requests Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
             <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield size={18} className="text-brand-primary dark:text-[#17b385]" />
                  Pairing Requests
                </h3>
                <div className="flex items-center gap-2">
                   <button onClick={loadRequests} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Refresh">
                     <RefreshCw size={16} className={isLoadingRequests ? 'animate-spin' : ''} />
                   </button>
                   <button onClick={() => setIsRequestsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Close">
                     <X size={20} />
                   </button>
                </div>
             </div>
             
             <div className="p-4 overflow-y-auto">
               {pendingRequests.length > 0 ? (
                 <div className="flex flex-col gap-3">
                   {pendingRequests.map((req) => (
                     <div
                       key={req.id}
                       className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded p-4 shadow-sm transition-colors"
                     >
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                             <Smartphone size={18} />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-slate-900 dark:text-white">{req.sender_name || 'New Device'}</p>
                             <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                               Requested {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                             </p>
                           </div>
                         </div>

                         {approveId === req.id ? (
                           <div className="flex items-center gap-2 w-full sm:w-auto">
                             <input
                               type="text"
                               placeholder="Vehicle name"
                               value={vehicleName}
                               onChange={(e) => setVehicleName(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleApprove(req.id)}
                               autoFocus
                               className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 flex-1 sm:w-32 transition-colors focus:outline-none focus:border-brand-primary"
                             />
                             <button
                               onClick={() => handleApprove(req.id)}
                               disabled={!vehicleName.trim() || processing === req.id}
                               className="p-1.5 rounded bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 cursor-pointer transition-colors"
                             >
                               <Check size={14} />
                             </button>
                             <button
                               onClick={() => { setApproveId(null); setVehicleName('') }}
                               className="p-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                             >
                               <X size={14} />
                             </button>
                           </div>
                         ) : (
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => { setApproveId(req.id); setVehicleName(req.sender_name || '') }}
                               disabled={processing === req.id}
                               className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 cursor-pointer shadow-sm"
                             >
                               <Check size={13} /> Approve
                             </button>
                             <button
                               onClick={() => handleReject(req.id)}
                               disabled={processing === req.id}
                               className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 cursor-pointer"
                             >
                               <X size={13} /> Reject
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-10 text-center transition-colors">
                   <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-3">
                     <Check size={24} className="text-slate-400 dark:text-slate-500" />
                   </div>
                   <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pending requests</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">When someone enters your account code on the GPS Sender page, their request will appear here.</p>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}
      </AnimatePresence>

      <PlaybackModal 
        session={activePlaybackSession} 
        onClose={() => setActivePlaybackSession(null)} 
      />

      <DeleteVehicleModal
        isOpen={!!deletingVehicle}
        onClose={() => setDeletingVehicle(null)}
        vehicle={deletingVehicle}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
        title="Delete Tracking Session"
        message="Are you sure you want to delete this tracking session? This will permanently remove all location history for this route and cannot be undone."
        confirmText="Delete Session"
        isDestructive={true}
      />
    </motion.div>
  )
}
