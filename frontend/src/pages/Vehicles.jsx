import { Truck, MapPin, Clock, Smartphone, Car, Bike, Bus, Edit2, Shield, Check, X, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { fetchPairingRequests, approvePairingRequest, rejectPairingRequest } from '../api/fleetApi'
import EditVehicleModal from '../components/EditVehicleModal'
import { motion } from 'framer-motion'

/**
 * Vehicles page — simple clean table view of all tracked devices.
 */
export default function Vehicles({ vehicles, locations, isLoading, isConnected, lastMessage, onToggleMobileMenu, onRefresh }) {
  const navigate = useNavigate()
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)

  const [requests, setRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [requestsError, setRequestsError] = useState(null)
  const [approveId, setApproveId] = useState(null)
  const [vehicleName, setVehicleName] = useState('')
  const [processing, setProcessing] = useState(null)

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


      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <img src="/globe.svg" alt="Loading..." className="w-10 h-10 mb-3 opacity-70" />
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vehicles List</h3>
              <button 
                onClick={() => setIsRequestsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Shield size={14} className={pendingRequests.length > 0 ? "text-amber-500" : "text-slate-400"} />
                Pairing Requests {pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}
              </button>
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            {vehicles.length === 0 ? (
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
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
                        {['#', 'Name', 'Device ID', 'Coordinates', 'Last Seen', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {vehicles.map((v) => {
                        const loc = locations[v.id]
                        const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                        return (
                          <tr 
                            key={v.id} 
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            {/* ID */}
                            <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">{v.id}</td>

                            {/* Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getVehicleIcon(v.vehicle_type)}
                                <span className="font-semibold text-slate-900 dark:text-white">{v.name}</span>
                              </div>
                            </td>

                            {/* Device ID */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Smartphone size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{v.device_id}</span>
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
                                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
                                  : loc
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} style={{ width: 6, height: 6 }} />
                                {isActive ? 'Active' : loc ? 'Idle' : 'No Signal'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* ── Mobile Card View ────────────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-3">
                  {vehicles.map((v) => {
                    const loc = locations[v.id]
                    const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                    return (
                      <div 
                        key={v.id} 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col gap-3 hover:border-brand-primary dark:hover:border-[#17b385] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getVehicleIcon(v.vehicle_type)}
                            <span className="font-bold text-slate-900 dark:text-white">{v.name}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
                              : loc
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} style={{ width: 6, height: 6 }} />
                            {isActive ? 'Active' : loc ? 'Idle' : 'No Signal'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-slate-400 dark:text-slate-500">Device ID</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{v.device_id}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 dark:text-slate-500">Last Seen</span>
                            <span className="text-slate-700 dark:text-slate-300">{loc ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true }) : '—'}</span>
                          </div>
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
      {isRequestsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
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
    </motion.div>
  )
}
