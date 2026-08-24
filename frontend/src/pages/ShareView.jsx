import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navigation, Truck, MapPin, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import GlobeLoader from '../components/GlobeLoader'
import FleetMap from '../components/FleetMap'
import { fetchSharedVehicle } from '../api/fleetApi'
import { motion } from 'framer-motion'

export default function ShareView() {
  const { shareCode } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function load(isInitial = false) {
      try {
        if (isInitial) setIsLoading(true)
        const data = await fetchSharedVehicle(shareCode)
        if (isMounted) {
          setVehicle(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted && isInitial) setIsLoading(false)
      }
    }
    load(true)
    const interval = setInterval(() => load(false), 1000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [shareCode])

  const locations = vehicle?.latest_location
    ? { [vehicle.id]: vehicle.latest_location }
    : {}

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex flex-col fixed inset-0 bg-white"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="myfleetOS" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Shared Live Tracking
            </h1>
            <p className="text-xs text-slate-500">
              {vehicle ? vehicle.name : 'Shared Vehicle'}
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-semibold text-brand-primary hover:text-brand-primary/80 bg-brand-primary/10 px-3 py-1.5 rounded border border-brand-primary/30"
        >
          Sign In
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {isLoading && !vehicle ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
             <GlobeLoader className="w-12 h-12 mb-4 opacity-70" />
             <p className="text-slate-500 font-medium text-sm">Connecting to GPS tracker...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <AlertCircle size={32} className="text-rose-500 mb-2" />
            <p className="text-base font-bold text-slate-900">Shared Link Expired or Not Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              The tracking link with code <strong>{shareCode}</strong> could not be loaded.
            </p>
          </div>
        ) : (
          <>
            <FleetMap
              vehicles={vehicle ? [vehicle] : []}
              locations={locations}
              selectedVehicle={vehicle}
            />

            {/* Vehicle info card overlay */}
            <div className="absolute bottom-5 left-5 bg-white border border-slate-200 shadow-md rounded p-4 max-w-sm w-full animate-slide-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-brand-primary text-white flex items-center justify-center">
                  <Truck size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{vehicle.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{vehicle.device_id}</p>
                </div>
              </div>

              {vehicle.latest_location ? (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                    <MapPin size={12} className="text-brand-primary" />
                    <span>
                      {vehicle.latest_location.latitude.toFixed(6)},{' '}
                      {vehicle.latest_location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>
                      {formatDistanceToNow(new Date(vehicle.latest_location.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
                  No location updates received yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
