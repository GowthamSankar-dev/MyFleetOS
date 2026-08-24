import { Truck, MapPin, Clock, Trash2, Edit2, Car, Bike, Bus, MoreVertical, Crosshair, History } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect, useRef } from 'react'

/**
 * VehicleCard — a single vehicle row in the sidebar vehicle list with delete action.
 */
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000   // 2 minutes

export default function VehicleCard({ vehicle, location, isSelected, isFollowed, onSelect, onToggleFollow, onEdit, onDelete, onPlaybackSession }) {
  const hasLocation = !!location

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'truck': return <Truck size={13} />
      case 'motorcycle': return <Bike size={13} />
      case 'bus': return <Bus size={13} />
      case 'car':
      default: return <Car size={13} />
    }
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = hasLocation
    ? (vehicle.active_session_id !== null) && (Date.now() - new Date(location.timestamp).getTime() < ACTIVE_THRESHOLD_MS)
    : false

  const lastSeen = hasLocation
    ? formatDistanceToNow(new Date(location.timestamp), { addSuffix: true })
    : 'No location yet'

  const handleDelete = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    if (onDelete) onDelete(vehicle)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    if (onEdit) onEdit(vehicle)
  }

  return (
    <div
      onClick={() => onSelect(vehicle)}
      className={`w-full text-left p-3.5 rounded border transition-all cursor-pointer group ${
        isSelected
          ? 'bg-brand-primary/10 dark:bg-[#17b385]/10 border-brand-primary dark:border-[#17b385] shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-brand-primary dark:bg-[#17b385] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {getVehicleIcon(vehicle.vehicle_type)}
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {vehicle.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
            {isActive ? 'Online' : 'Offline'}
          </span>
          
          <div className="relative flex items-center opacity-80 group-hover:opacity-100 transition-opacity" ref={menuRef}>
            {(onEdit || onDelete) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(!isMenuOpen)
                }}
                title="Options"
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded transition-colors cursor-pointer"
              >
                <MoreVertical size={14} />
              </button>
            )}

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-10">
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-primary dark:hover:text-[#17b385] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ── Location & time ────────────────────────────────────────────── */}
      {hasLocation ? (
        <div className="flex items-end justify-between pt-1 border-t border-slate-100 dark:border-slate-800 mt-1.5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
              <MapPin size={11} className="text-brand-primary dark:text-[#17b385] shrink-0" />
              <span className="font-mono">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <Clock size={10} className="shrink-0" />
              <span>{lastSeen}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleFollow && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFollow(vehicle.id)
                }}
                title={isFollowed ? "Stop following" : "Follow vehicle on map"}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  isFollowed 
                    ? 'text-brand-primary dark:text-[#17b385] bg-brand-primary/10 dark:bg-[#17b385]/10' 
                    : 'text-slate-400 hover:text-brand-primary dark:hover:text-[#17b385] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Crosshair size={14} />
              </button>
            )}

            {onPlaybackSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlaybackSession(vehicle)
                }}
                title="View Tracking History"
                className="p-1.5 rounded text-slate-400 hover:text-brand-primary dark:hover:text-[#17b385] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <History size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">Waiting for location…</p>
      )}

    </div>
  )
}
