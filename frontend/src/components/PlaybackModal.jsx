import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchSessionLocations, fetchGeofences } from '../api/fleetApi'
import PlaybackMap from './PlaybackMap'
import GlobeLoader from './GlobeLoader'

export default function PlaybackModal({ session, onClose }) {
  const [locations, setLocations] = useState(null)
  const [geofences, setGeofences] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGeofences()
      .then(setGeofences)
      .catch(err => console.error("Failed to fetch geofences for playback:", err))
  }, [])

  useEffect(() => {
    if (session) {
      setIsLoading(true)
      setError(null)
      fetchSessionLocations(session.vehicle_id, session.id)
        .then(data => {
            if (data.length < 2) {
                setError("Not enough location points to playback.")
            } else {
                setLocations(data)
            }
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false))
    }
  }, [session])

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col"
        >
          {isLoading ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
               <GlobeLoader className="w-12 h-12 mb-4 opacity-70 animate-pulse" />
               <p className="text-sm font-semibold">Loading playback data...</p>
               <button onClick={onClose} className="mt-6 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded">Cancel</button>
             </div>
          ) : error ? (
             <div className="flex-1 flex flex-col items-center justify-center">
               <p className="text-rose-500 font-bold mb-4">{error}</p>
               <button onClick={onClose} className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Close</button>
             </div>
          ) : (
             <PlaybackMap locations={locations} geofences={geofences} onClose={onClose} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
